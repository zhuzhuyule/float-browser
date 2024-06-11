(function () {
  let count = 0;
  let useCache = localStorage.getItem('use_cache') === 'true';
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

  function getApiURL(url) {
    return url.startsWith('http://') || url.startsWith('https://') ? url : `${new URL(location.href).protocol}//${url}`;
  }
  function cacheRequest() {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      let url = getApiURL(args[0]);
      let method = args[1]?.method || 'GET';
      if (args[0] instanceof Request) {
        url = getApiURL(args[0].url);
        method = args[0].method;
      }
      method = method.toUpperCase();

      if (useCache) {
        const str = await browserCall('__get_cache_request', pageInfo.host, `${urlInfo.origin}${urlInfo.pathname}`, pageUrl());
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
      }

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
      this._method = args[0] || 'GET';
      Object.defineProperty(this, 'responseURL', { value: getApiURL(args[1]), writable: true });
      return originalXhrOpen.apply(this, args);
    };
    XMLHttpRequest.prototype.send = function (...args) {
      const _this = this;
      const url = _this.responseURL;
      const method = _this._method; // 获取请求类型，默认为 GET
      const pageInfo = new URL(location.href);
      const urlInfo = new URL(url);

      if (useCache) {
        browserCall('__get_cache_request', pageInfo.host, `${urlInfo.origin}${urlInfo.pathname}`, pageUrl()).then(str => {
          try {
            if (str) {
              const cachedResponse = JSON.parse(str);
              Object.defineProperty(_this, 'readyState', { value: XMLHttpRequest.DONE, writable: false });
              Object.defineProperty(_this, 'status', { value: +cachedResponse.status, writable: false });
              Object.defineProperty(_this, 'response', { value: cachedResponse.response, writable: false });
              Object.defineProperty(_this, 'responseText', { value: cachedResponse.response, writable: false });
              Object.defineProperty(_this, 'responseType', { value: '', writable: false });
              Object.defineProperty(_this, 'responseXML', { value: null, writable: false });
              Object.defineProperty(_this, 'getAllResponseHeaders', { value: () => formatHeaders(cachedResponse.header), writable: false });
              browserAction('__browser_request', {
                url,
                method,
                page: pageUrl(),
                status: _this.status,
                response: _this.responseText,
                header: parseHeaders(_this.getAllResponseHeaders())
              });
              const event = new Event('readystatechange');
              _this.dispatchEvent(event);
              _this.onloadend();
              return;
            } else {
              callTheApi();
            }
          } catch {
            callTheApi();
          }
        });
      } else {
        callTheApi();
      }

      function callTheApi() {
        _this.addEventListener('readystatechange', event => {
          if (_this.readyState === XMLHttpRequest.DONE) {
            browserAction('__browser_request_update', {
              url,
              method,
              page: pageUrl(),
              status: _this.status,
              response: _this.responseText,
              header: parseHeaders(_this.getAllResponseHeaders())
            });
          }
        });

        originalXhrSend.apply(_this, args);
      }
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

  window.setUseCache = function (value) {
    localStorage.setItem('use_cache', value.toString());
  };
})();
