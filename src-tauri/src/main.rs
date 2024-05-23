// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::Result;
use std::env::consts::OS;
use tauri::Manager;

mod preload;
// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, serde::Serialize)]
struct Payload {
    label: String,
    url: String,
    cmd: String,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn navigate_url(window: tauri::Window, id: String, url: String) {
    let browser = window.get_window(id.as_str()).unwrap();

    browser
        .eval(&format!(r#"window.location.href="{}""#, url))
        .expect("navigate failed");
}

#[tauri::command]
fn use_cache(window: tauri::Window, id: String, open: String, list: String) {
    let browser = window.get_window(id.as_str()).unwrap();

    browser
        .eval(&format!(
            r#"window.setUseCache({});/*window.updateCacheList({})*/;location.reload()"#,
            open, list
        ))
        .expect("navigate failed");
}

#[tauri::command]
fn toggle_devtools(window: tauri::Window, id: String) {
    let browser = window.get_window(id.as_str()).unwrap();
    if browser.is_devtools_open() {
        browser.close_devtools();
    } else {
        browser.open_devtools();
    }
}

#[tauri::command]
fn browser_directive(window: tauri::Window, id: String, command: String) {
    let browser = window.get_window(id.as_str()).unwrap();

    let command_str = match command.as_str() {
        "reload" => r#"location.reload()"#,
        "back" => r#"history.back()"#,
        "forward" => r#"history.forward()"#,
        _ => "",
    };

    if !command_str.is_empty() {
        browser
            .eval(&format!("{}", command_str))
            .expect("navigate failed");
    }
}

fn inject_router_watch(window: tauri::Window) {
    window.eval(
        &format!(
            r#"
                function initWatch(){{
                    window.__has_initialized = true;
                    let preUrl="";

                    function debounce(f, d){{let e;return function(){{const c=this;const a=arguments;clearTimeout(e);e=setTimeout(()=>{{f.apply(c,a);}},d);}}}};
                    
                    function routeChange(){{debounce(()=>{{if (window.location.href===preUrl) return; preUrl=window.location.href; window.__TAURI_INVOKE__('__initialized',{{url:JSON.stringify({{url: preUrl, id: 'main'}})}});}},200)();}}
                    window.addEventListener('popstate', routeChange);
                    
                    const p=history.pushState;history.pushState=function(){{p.apply(this,arguments);routeChange();}};
                    const r=history.replaceState;history.replaceState=function(){{r.apply(this,arguments);routeChange();}};
                }};

                function cacheRequest(){{
                    (function() {{
                        let useCache = JSON.parse(localStorage.getItem('useCache') || 'false'); 
                        const cacheList = new Set(JSON.parse(localStorage.getItem('cacheList') || '[]')); 
                        const requestCache = new Map(JSON.parse(localStorage.getItem('requestCache') || '[]')); 
                      
                        const originalFetch = window.fetch;
                        window.fetch = async function(...args) {{
                            const url = args[0];
                            const type = args[1]?.method || 'GET'; 
                            const cacheKey = location.href + '|||' + url; 
                            window.__TAURI_INVOKE__('__initialized', {{ url: JSON.stringify({{ command: '__request__url', type: type.toUpperCase(), url: url, page: location.href }}) }});
                            if (useCache && cacheList.size === 0 && requestCache.has(cacheKey)) {{
                                return new Response(requestCache.get(cacheKey));
                            }} else if (useCache && cacheList.has(url) && requestCache.has(cacheKey)) {{
                                return new Response(requestCache.get(cacheKey));
                            }}
                            const response = await originalFetch.apply(this, args);
                            const clonedResponse = await response.clone().text();
                            requestCache.set(cacheKey, clonedResponse);
                            localStorage.setItem('requestCache', JSON.stringify(Array.from(requestCache.entries()))); // 将 requestCache 缓存在 localStorage
                            return response;
                        }};
                      
                        const originalXhrOpen = XMLHttpRequest.prototype.open;
                        const originalXhrSend = XMLHttpRequest.prototype.send;
                        XMLHttpRequest.prototype.open = function(...args) {{
                            this._url = args[1];
                            Object.defineProperty(this, 'responseURL', {{value: args[1],writable: true}});
                            return originalXhrOpen.apply(this, args);
                        }};
                        XMLHttpRequest.prototype.send = function(...args) {{
                            const url = this._url;
                            const type = args[0]?.toUpperCase() || 'GET'; // 获取请求类型，默认为 GET
                            const cacheKey = location.href + '|||' + url; // 使用当前页面 URL 和请求 URL 作为缓存键值
                            window.__TAURI_INVOKE__('__initialized', {{ url: JSON.stringify({{ command: '__request__url', type: type, url: url, page: location.href }}) }});
                            if (useCache && cacheList.size === 0 && requestCache.has(cacheKey)) {{
                                const cachedResponse = requestCache.get(cacheKey);
                                console.log('---start---',typeof cachedResponse);
                                setTimeout(() => {{
                                    Object.defineProperty(this, 'readyState', {{value: XMLHttpRequest.DONE,writable: false}});
                                    Object.defineProperty(this, 'status', {{value: 200,writable: false}});
                                    Object.defineProperty(this, 'response', {{value: cachedResponse,writable: false}});
                                    Object.defineProperty(this, 'responseText', {{value: cachedResponse,writable: false}});  
                                    Object.defineProperty(this, 'responseType', {{value: '',writable: false}});
                                    Object.defineProperty(this, 'responseXML', {{value: null,writable: false}});
                                    const event = new Event('readystatechange');
                                    this.dispatchEvent(event);
                                    this.onreadystatechange?.();
                                    this.onloadend();
                                }}, 0);
                                return;
                            }} else if (useCache && cacheList.has(url) && requestCache.has(cacheKey)) {{
                                const cachedResponse = requestCache.get(cacheKey);
                                setTimeout(() => {{
                                    Object.defineProperty(this, 'readyState', {{value: XMLHttpRequest.DONE,writable: false}});
                                    Object.defineProperty(this, 'status', {{value: 200,writable: false}});
                                    Object.defineProperty(this, 'response', {{value: cachedResponse,writable: false}});
                                    Object.defineProperty(this, 'responseText', {{value: cachedResponse,writable: false}});  
                                    Object.defineProperty(this, 'responseType', {{value: '',writable: false}});
                                    Object.defineProperty(this, 'responseXML', {{value: null,writable: false}});
                                    const event = new Event('readystatechange');
                                    this.dispatchEvent(event);
                                    this.onreadystatechange?.();
                                    this.onloadend();
                                }}, 0);
                                return;
                            }}
                            this.addEventListener('readystatechange', (event) => {{
                                if (this.readyState === 4 && this.status === 200) {{
                                    requestCache.set(cacheKey, this.responseText);
                                    console.log('------------------', this);
                                    localStorage.setItem('requestCache', JSON.stringify(Array.from(requestCache.entries()))); // 将 requestCache 缓存在 localStorage
                                }}
                            }});
                            return originalXhrSend.apply(this, args);
                        }};
                      
                        window.setUseCache = function(value) {{
                            useCache = value;
                            localStorage.setItem('useCache', JSON.stringify(useCache)); // 将 useCache 缓存在 localStorage
                        }};
                      
                        window.updateCacheList = function(urls) {{
                            cacheList.clear();
                            urls.forEach(url => {{
                                cacheList.add(url);
                            }});
                            localStorage.setItem('cacheList', JSON.stringify(Array.from(cacheList))); // 将 cacheList 缓存在 localStorage
                        }};
                      
                        window.clearCacheList = function() {{
                            cacheList.clear();
                            requestCache.clear();
                            localStorage.removeItem('cacheList');
                            localStorage.removeItem('requestCache');
                        }};
                      
                        // 在页面加载时恢复 useCache 的值
                        window.onload = function() {{
                            
                        }};
                        const cachedUseCache = JSON.parse(localStorage.getItem('useCache'));
                        if (cachedUseCache !== null) {{
                            useCache = cachedUseCache;
                        }}
                      }})();
                      
                    //   window.setUseCache(true);
                    //   window.setUseCache(false);
                    //   window.updateCacheList([
                    //     'https://example.com/api/data1',
                    //     'https://example.com/api/data2',
                    //     'https://example.com/api/data3'
                    //   ]);
                    //   window.clearCacheList();
                }}

                function addShortKey() {{
                    document.addEventListener('keypress', (e) => {{
                        const cmdKey = '{}' === 'macos' ? e.metaKey : e.ctrlKey;

                        if (e.altKey && cmdKey && (e.code === 'KeyI' || e.code === 'KeyJ')) {{
                            window.__TAURI_INVOKE__('__initialized',{{url:JSON.stringify({{command: '__open__devtools'}})}});
                        }}

                        if (e.shiftKey || e.altKey) return;
                        if (cmdKey) {{
                            switch (e.code) {{
                                case 'KeyR':
                                    location.reload();
                                    break;
                                case 'BracketLeft':
                                    history.back();
                                    break;
                                case 'BracketRight':
                                    history.forward();
                                    break;
                            }}
                        }}
                    }})
                }}
                if (!window.__has_initialized) {{ initWatch(); addShortKey(); cacheRequest()}}
            "#, OS
    )).expect("eval failed");
}

fn emit_browser_bar(browser_win: tauri::Window, label: String, url: String) {
    browser_win
        .emit_to(
            format!("{}_bar", label).as_str(),
            "webview-loaded",
            Payload {
                label: label,
                url: browser_win.url().to_string(),
                cmd: if let true = url.starts_with("{") {
                    url
                } else {
                    "".to_string()
                },
            },
        )
        .unwrap();
}

fn emit_browser_bar_request(browser_win: tauri::Window, label: String, url: String) {
    browser_win
        .emit_to(
            format!("{}_bar", label).as_str(),
            "webview-request",
            Payload {
                label: label,
                url: browser_win.url().to_string(),
                cmd: url,
            },
        )
        .unwrap();
}

fn browser_command(browser_win: tauri::Window, label: String, command: String) {
    let result: Result<serde_json::Value> = serde_json::from_str(command.as_str());
    match result {
        Ok(json_data) => {
            if json_data["command"] == "__open__devtools" {
                toggle_devtools(browser_win, label);
            } else if json_data["command"] == "__request__url" {
                emit_browser_bar_request(browser_win, label, command);
            } else {
                emit_browser_bar(browser_win, label, command);
            }
        }
        Err(e) => {
            println!("Failed to parse JSON: {}", e);
            return {};
        }
    };
}


fn main() {
    tauri::Builder::default()
        .plugin(preload::PreloadPlugin::new())
        .invoke_handler(tauri::generate_handler![
            browser_directive,
            navigate_url,
            use_cache,
            toggle_devtools
        ])
        .on_page_load(|window, payload| {
            let label = window.label().to_string();
            let url = payload.url().to_string();
            if label == "main" {
            } else if label.starts_with("browser") {
                if label.ends_with("bar") {
                    window.listen("contextmenu", move |_event| {
                        // 阻止右键菜单事件的默认行为
                    });
                } else {
                    let browser_win = window.clone();
                    if url.starts_with("{") {
                        browser_command(browser_win, label, url);
                    } else {
                        inject_router_watch(browser_win.clone());
                        emit_browser_bar(browser_win, label, url);
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
