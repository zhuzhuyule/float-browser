// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod command;
mod preload;

fn main() {
    tauri::Builder::default()
        .plugin(preload::PreloadPlugin::new())
        .invoke_handler(tauri::generate_handler![
            command::browser_directive,
            command::navigate_url,
            command::use_cache,
            command::toggle_devtools
        ])
        .on_page_load(|window, payload| {
            let label = window.label().to_string();
            let url = payload.url().to_string();
            if label.starts_with("browser") & !label.ends_with("bar") {
                if url.starts_with("{") {
                    command::browser_command(window.clone(), label, url);
                } else {
                    command::emit_browser_bar(window.clone(), label);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
