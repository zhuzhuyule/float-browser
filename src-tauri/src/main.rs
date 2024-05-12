// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, serde::Serialize)]
struct Payload {
    label: String,
    url: String,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn on_route_change(window: tauri::Window, id: String) {
    let bar_window = window.get_window(id.as_str()).unwrap();
    println!("---------{:?}", window.label());

    bar_window
        .emit(
            "on_route_change",
            Payload {
                label: window.label().to_string(),
                url: window.url().to_string(),
            },
        )
        .unwrap();
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
        .invoke_handler(tauri::generate_handler![on_route_change])
        .on_page_load(|window, payload| {
            let label = window.label().to_string();
            let url = payload.url().to_string();
            if label == "main" {
            } else if label.starts_with("browser") {
                if label.ends_with("bar") && !url.starts_with("{") {
                    inject_router_watch(window.clone());
                    window.open_devtools();
                }
                window
                    .emit_all(
                        "webview-loaded",
                        Payload {
                            label: window.label().to_string(),
                            url: payload.url().to_string(),
                        },
                    )
                    .unwrap();
            }
        })
        .setup(|app| {
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
