(function () {
  let count = 0;
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
        count = 0;
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
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      let url = args[0];
      let method = args[1]?.method || 'GET';
      if (args[0] instanceof Request) {
        url = args[0].url;
        method = args[0].method;
      }
      method = method.toUpperCase();

      const str = await browserCall('__get_cache_request', pageInfo.host, `${urlInfo.host}${urlInfo.pathname}`, pageUrl());
      try {
        if (str) {
          const cachedResponse = JSON.parse(str);
          browserAction('__browser_request', {
            url,
            method,
            page: pageUrl(),
            status: cachedResponse.status,
            response: cachedResponse.response,
            header: cachedResponse.header
          });
          return new Response(cachedResponse.response, { headers: cachedResponse.header, status: +cachedResponse.status });
        }
      } catch {}

      const response = await originalFetch.apply(this, args);

      const headers = {};
      const clonedResponse = response.clone();
      clonedResponse.headers.forEach((value, key) => {
        if (excludeHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith('x')) {
          headers[key] = value;
        }
      });

      browserAction('__browser_request_update', {
        url,
        method,
        page: pageUrl(),
        status: response.status,
        response: await clonedResponse.text(),
        header: headers
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
    XMLHttpRequest.prototype.send = async function (...args) {
      const url = this.responseURL;
      const method = this._method; // 获取请求类型，默认为 GET
      const pageInfo = new URL(location.href);
      const urlInfo = new URL(url);

      const str = await browserCall('__get_cache_request', pageInfo.host, `${urlInfo.host}${urlInfo.pathname}`, pageUrl());
      try {
        if (str) {
          const cachedResponse = JSON.parse(str);
          Object.defineProperty(this, 'readyState', { value: XMLHttpRequest.DONE, writable: false });
          Object.defineProperty(this, 'status', { value: +cachedResponse.status, writable: false });
          Object.defineProperty(this, 'response', { value: cachedResponse.response, writable: false });
          Object.defineProperty(this, 'responseText', { value: cachedResponse.response, writable: false });
          Object.defineProperty(this, 'responseType', { value: '', writable: false });
          Object.defineProperty(this, 'responseXML', { value: null, writable: false });
          Object.defineProperty(this, 'getAllResponseHeaders', { value: () => formatHeaders(cachedResponse.header), writable: false });
          browserAction('__browser_request', {
            url,
            method,
            page: pageUrl(),
            status: this.status,
            response: this.responseText,
            header: parseHeaders(this.getAllResponseHeaders())
          });
          const event = new Event('readystatechange');
          this.dispatchEvent(event);
          this.onloadend();
          return;
        }
      } catch {}

      this.addEventListener('loadend', event => {
        if (this.readyState === 4 && XMLHttpRequest.DONE) {
          browserAction('__browser_request_update', {
            url,
            method,
            page: pageUrl(),
            status: this.status,
            response: this.responseText,
            header: parseHeaders(this.getAllResponseHeaders())
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
    const key = `__browser_call_key_${time}_${count++}`;
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

  function pageUrl() {
    const info = new URL(location.href);
    return `${info.origin}${info.pathname}`;
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
