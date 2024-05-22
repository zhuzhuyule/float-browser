// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::Result;
use std::env::consts::OS;
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
                if (!window.__has_initialized) {{ initWatch(); addShortKey(); }}
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

fn browser_command(browser_win: tauri::Window, label: String, command: String) {
    let result: Result<serde_json::Value> = serde_json::from_str(command.as_str());
    match result {
        Ok(json_data) => {
            if json_data["command"] == "__open__devtools" {
                toggle_devtools(browser_win, label);
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
        .invoke_handler(tauri::generate_handler![
            browser_directive,
            navigate_url,
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
