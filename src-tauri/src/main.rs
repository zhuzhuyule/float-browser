// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod command;
mod invokes;
mod preload;

fn main() {
    tauri::Builder::default()
        .plugin(preload::PreloadPlugin::new())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            invokes::get_browser_url,
            invokes::browser_execute_action,
            invokes::browser_navigate,
            invokes::browser_update_cache,
            invokes::browser_toggle_devtools
        ])
        .on_page_load(|window, page_load_payload| {
            let label = window.label().to_string();
            let mut payload = page_load_payload.url().to_string();
            if label.starts_with("browser") & !label.ends_with("bar") {
                if !payload.starts_with("{") {
                    payload = format!(
                        r#"{{ "command": "__browser_loaded", "params": ["{}"] }}"#,
                        window.url()
                    );
                }
                command::browser_invoke(window.clone(), label, payload);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
