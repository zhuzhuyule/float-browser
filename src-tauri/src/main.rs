// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::Result;
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
                } else {
                    let browser_win = window.clone();
                    if url.starts_with("{") {
                        browser_command(browser_win, label, url);
                    } else {
                        emit_browser_bar(browser_win, label, url);
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
