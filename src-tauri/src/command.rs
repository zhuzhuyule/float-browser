use serde_json::Result;
use tauri::Manager;

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, serde::Serialize)]
struct Payload {
    label: String,
    url: String,
    cmd: Option<String>,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
pub fn navigate_url(window: tauri::Window, id: String, url: String) {
    let browser = window.get_window(id.as_str()).unwrap();

    browser
        .eval(&format!(r#"window.location.href="{}""#, url))
        .expect("navigate failed");
}

#[tauri::command]
pub fn use_cache(window: tauri::Window, id: String, open: String, list: String) {
    let browser = window.get_window(id.as_str()).unwrap();

    browser
        .eval(&format!(
            r#"window.setUseCache({});/*window.updateCacheList({})*/;location.reload()"#,
            open, list
        ))
        .expect("navigate failed");
}

#[tauri::command]
pub fn toggle_devtools(window: tauri::Window, id: String) {
    let browser = window.get_window(id.as_str()).unwrap();
    if browser.is_devtools_open() {
        browser.close_devtools();
    } else {
        browser.open_devtools();
    }
}

#[tauri::command]
pub fn browser_directive(window: tauri::Window, id: String, command: String) {
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

pub fn emit_browser_bar(browser_win: tauri::Window, label: String) {
    browser_win
        .emit_to(
            format!("{}_bar", label).as_str(),
            "webview-loaded",
            Payload {
                label: label,
                url: browser_win.url().to_string(),
                cmd: None,
            },
        )
        .unwrap();
}

pub fn emit_browser_bar_request(browser_win: tauri::Window, label: String, command: String) {
    browser_win
        .emit_to(
            format!("{}_bar", label).as_str(),
            "webview-request",
            Payload {
                label: label,
                url: browser_win.url().to_string(),
                cmd: Some(command),
            },
        )
        .unwrap();
}

pub fn browser_execute(win: tauri::Window, key: String, data: &str) {
    win.eval(&format!(
        r#"
            (() => {{
                const event = new CustomEvent({}, {{ detail: '{}' }});
                window.__float_browser_event_target.dispatchEvent(event); 
            }})()
        "#,
        key, data
    ))
    .expect("browser_execute failed");
}

pub fn browser_command(browser_win: tauri::Window, label: String, command: String) {
    let result: Result<serde_json::Value> = serde_json::from_str(command.as_str());
    match result {
        Ok(json_data) => {
            if json_data["command"] == "__open__devtools" {
                toggle_devtools(browser_win, label);
            } else if json_data["command"] == "__request__url" {
                emit_browser_bar_request(browser_win, label, command);
            } else if json_data["command"] == "__float_browser_action" {
                browser_execute(
                    browser_win,
                    json_data["key"].to_string(),
                    serde_json::to_string(&json_data["params"])
                        .unwrap()
                        .as_str(),
                );
            } else {
                emit_browser_bar(browser_win, label);
            }
        }
        Err(e) => {
            println!("Failed to parse JSON: {}", e);
            return {};
        }
    };
}
