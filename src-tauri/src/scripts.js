(function () {
  function initWatch() {
    let preUrl = '';
    let e;
    function debounce(f, d = 100) {
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
        browserAction('__browser_loaded', preUrl, document.title);
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

  const excludeHeaders = ['content-encoding', 'content-length', 'content-type', 'date', 'server', 'vary'];

  function cacheRequest() {
    let useCache = JSON.parse(localStorage.getItem('useCache') || 'false');
    const cacheList = new Set(JSON.parse(localStorage.getItem('cacheList') || '[]'));
    const requestCache = new Map(JSON.parse(localStorage.getItem('requestCache') || '[]'));

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      let url = args[0];
      let method = args[1]?.method || 'GET';
      if (args[0] instanceof Request) {
        url = args[0].url;
        method = args[0].method;
      }
      method = method.toUpperCase();

      const response = await originalFetch.apply(this, args);

      const headers = {};
      const clonedResponse = response.clone();
      clonedResponse.headers.forEach((value, key) => {
        if (excludeHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith('x')) {
          headers[key] = value;
        }
      });

      browserAction('__browser_request', {
        type: 'fetch',
        url,
        method,
        page: location.href,
        response: await clonedResponse.text(),
        responseHeader: headers
      });
      return response;
    };

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (...args) {
      this._method = args[0];
      Object.defineProperty(this, 'responseURL', { value: args[1] || 'GET', writable: true });
      return originalXhrOpen.apply(this, args);
    };
    XMLHttpRequest.prototype.send = function (...args) {
      const url = this.responseURL;
      const method = this._method; // 获取请求类型，默认为 GET
      const cacheKey = location.href + '|||' + url; // 使用当前页面 URL 和请求 URL 作为缓存键值
      if (useCache && (cacheList.size === 0 || cacheList.has(url)) && requestCache.has(cacheKey)) {
        const cachedResponse = requestCache.get(cacheKey);
        setTimeout(() => {
          Object.defineProperty(this, 'readyState', { value: XMLHttpRequest.DONE, writable: false });
          Object.defineProperty(this, 'status', { value: 200, writable: false });
          Object.defineProperty(this, 'response', { value: cachedResponse, writable: false });
          Object.defineProperty(this, 'responseText', { value: cachedResponse, writable: false });
          Object.defineProperty(this, 'responseType', { value: '', writable: false });
          Object.defineProperty(this, 'responseXML', { value: null, writable: false });
          Object.defineProperty(this, 'getAllResponseHeaders', { value: () => formatHeaders({}), writable: false });
          const event = new Event('readystatechange');
          this.dispatchEvent(event);
          this.onloadend();
        }, 0);
        return;
      }

      this.addEventListener('loadend', event => {
        if (this.readyState === 4 && XMLHttpRequest.DONE) {
          requestCache.set(cacheKey, this.responseText);
          localStorage.setItem('requestCache', JSON.stringify(Array.from(requestCache.entries())));

          browserAction('__browser_request', {
            type: 'xhr',
            url,
            method,
            page: location.href,
            status: this.status,
            response: this.responseText,
            responseType: this.responseType,
            responseXML: this.responseXML,
            responseHeader: parseHeaders(this.getAllResponseHeaders())
          });
        }
      });
      return originalXhrSend.apply(this, args);
    };

    function parseHeaders(headers) {
      var result = {};
      var headersArray = headers.trim().split(/[\r\n]+/);
      headersArray.forEach(function (line) {
        var parts = line.split(': ');
        var key = parts.shift();
        var value = parts.join(': ');
        if (excludeHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith('x')) {
          result[key] = value;
        }
      });
      return result;
    }
    function formatHeaders(headersObj) {
      var result = '';
      for (var key in headersObj) {
        if (headersObj.hasOwnProperty(key)) {
          result += key + ': ' + headersObj[key] + '\r\n';
        }
      }
      return result;
    }

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
          case 'KeyY':
            browserAction('__browser_toggle_cache', true);
            break;
          case 'KeyN':
            browserAction('__browser_toggle_cache', false);
            break;
          case 'KeyL':
            browserAction('__browser_focus_address');
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
