// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

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
                if (!window.__has_initialized) {{ initWatch() }}
            "#
    )).expect("eval failed");
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![browser_directive, navigate_url])
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
                    inject_router_watch(browser_win.clone());
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
            }
        })
        // .setup(|app| {
        //     // #[cfg(debug_assertions)] // only include this code on debug builds
        //     // {
        //     //     let window = app.get_window("main").unwrap();
        //     //     window.open_devtools();
        //     // }
        //     // Ok(())
        // })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
