(function () {
  function initWatch() {
    let preUrl = '';
    function debounce(f, d) {
      let e;
      return function () {
        const c = this;
        const a = arguments;
        clearTimeout(e);
        e = setTimeout(() => {
          f.apply(c, a);
        }, d);
      };
    }

    function routeChange() {
      debounce(() => {
        if (window.location.href === preUrl) return;
        preUrl = window.location.href;
        browserAction('__browser_loaded', preUrl);
      }, 200)();
    }
    window.addEventListener('popstate', routeChange);

    const p = history.pushState;
    history.pushState = function () {
      p.apply(this, arguments);
      routeChange();
    };
    const r = history.replaceState;
    history.replaceState = function () {
      r.apply(this, arguments);
      routeChange();
    };
  }

  function cacheRequest() {
    (function () {
      let useCache = JSON.parse(localStorage.getItem('useCache') || 'false');
      const cacheList = new Set(JSON.parse(localStorage.getItem('cacheList') || '[]'));
      const requestCache = new Map(JSON.parse(localStorage.getItem('requestCache') || '[]'));

      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        const url = args[0];
        const type = args[1]?.method || 'GET';
        const cacheKey = location.href + '|||' + url;
        browserAction('__browser_request', {
          type: type.toUpperCase(),
          url,
          page: location.href
        });

        if (useCache && cacheList.size === 0 && requestCache.has(cacheKey)) {
          return new Response(requestCache.get(cacheKey));
        } else if (useCache && cacheList.has(url) && requestCache.has(cacheKey)) {
          return new Response(requestCache.get(cacheKey));
        }
        const response = await originalFetch.apply(this, args);
        const clonedResponse = await response.clone().text();
        requestCache.set(cacheKey, clonedResponse);
        localStorage.setItem('requestCache', JSON.stringify(Array.from(requestCache.entries()))); // 将 requestCache 缓存在 localStorage
        return response;
      };

      const originalXhrOpen = XMLHttpRequest.prototype.open;
      const originalXhrSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (...args) {
        this._url = args[1];
        Object.defineProperty(this, 'responseURL', { value: args[1], writable: true });
        return originalXhrOpen.apply(this, args);
      };
      XMLHttpRequest.prototype.send = function (...args) {
        const url = this._url;
        const type = args[0]?.toUpperCase() || 'GET'; // 获取请求类型，默认为 GET
        const cacheKey = location.href + '|||' + url; // 使用当前页面 URL 和请求 URL 作为缓存键值
        browserAction('__browser_request', {
          type: type.toUpperCase(),
          url,
          page: location.href
        });
        if (useCache && (cacheList.size === 0 || cacheList.has(url)) && requestCache.has(cacheKey)) {
          const cachedResponse = requestCache.get(cacheKey);
          setTimeout(() => {
            Object.defineProperty(this, 'readyState', { value: XMLHttpRequest.DONE, writable: false });
            Object.defineProperty(this, 'status', { value: 200, writable: false });
            Object.defineProperty(this, 'response', { value: cachedResponse, writable: false });
            Object.defineProperty(this, 'responseText', { value: cachedResponse, writable: false });
            Object.defineProperty(this, 'responseType', { value: '', writable: false });
            Object.defineProperty(this, 'responseXML', { value: null, writable: false });
            const event = new Event('readystatechange');
            this.dispatchEvent(event);
            // this.onreadystatechange?.();
            this.onloadend();
          }, 0);
          return;
        }
        this.addEventListener('readystatechange', event => {
          if (this.readyState === 4 && this.status === 200) {
            requestCache.set(cacheKey, this.responseText);
            localStorage.setItem('requestCache', JSON.stringify(Array.from(requestCache.entries())));
          }
        });
        return originalXhrSend.apply(this, args);
      };

      window.setUseCache = function (value) {
        useCache = value;
        localStorage.setItem('useCache', JSON.stringify(useCache));
      };

      window.updateCacheList = function (urls) {
        cacheList.clear();
        urls.forEach(url => {
          cacheList.add(url);
        });
        localStorage.setItem('cacheList', JSON.stringify(Array.from(cacheList)));
      };

      window.clearCacheList = function () {
        cacheList.clear();
        requestCache.clear();
        localStorage.removeItem('cacheList');
        localStorage.removeItem('requestCache');
      };

      // 在页面加载时恢复 useCache 的值
      const cachedUseCache = JSON.parse(localStorage.getItem('useCache'));
      if (cachedUseCache !== null) {
        useCache = cachedUseCache;
      }
    })();
  }

  function addShortKey() {
    document.addEventListener('keypress', e => {
      const cmdKey = '{$platform$}' === 'macos' ? e.metaKey : e.ctrlKey;

      if (e.altKey && cmdKey && (e.code === 'KeyI' || e.code === 'KeyJ')) {
        browserAction('__browser_toggle_devtools');
      }

      if (e.shiftKey || e.altKey) return;
      if (cmdKey) {
        switch (e.code) {
          case 'KeyR':
            location.reload();
            break;
          case 'KeyS':
            browserAction('__browser_toggle_expand');
            break;
          case 'BracketLeft':
            history.back();
            break;
          case 'BracketRight':
            history.forward();
            break;
        }
      }
    });
  }

  function browserCall(command, ...params) {
    const time = Date.now();
    const key = `__browser_call_key_${time}`;
    return new Promise(function (resolve) {
      window.__float_browser_event_target.addEventListener(key, event => resolve(event.detail), { once: true });
      window.__TAURI_INVOKE__('__initialized', {
        url: JSON.stringify({
          key,
          command,
          params
        })
      });
    });
  }

  function browserAction(command, ...params) {
    window.__TAURI_INVOKE__('__initialized', {
      url: JSON.stringify({
        command,
        params
      })
    });
  }

  if (/^browser_\d+$/.test(window.__TAURI_METADATA__.__currentWindow.label) && !window.__has_initialized) {
    window.__has_initialized = true;
    window.__float_browser_event_target = new EventTarget();
    window.__float_browser_action = browserAction;
    window.__float_browser_call = browserCall;

    initWatch();
    addShortKey();
    cacheRequest();
  }
})();
