use serde_json::Result;
use tauri::Manager;

use crate::invokes;

// the payload type must implement `Serialize` and `Clone`.
// #[derive(Clone, serde::Serialize)]
// struct Payload {
//     label: String,
//     url: String,
//     cmd: Option<String>,
// }

pub fn emit_browser_bar_command(browser_win: tauri::Window, label: String, payload: String) {
    browser_win
        .emit_to(
            format!("{}_bar", label).as_str(),
            "__browser__command",
            payload,
        )
        .unwrap();
}

pub fn emit_browser_callback(win: tauri::Window, key: String, data: &str) {
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

pub fn browser_invoke(window: tauri::Window, label: String, payload: String) {
    let result: Result<serde_json::Value> = serde_json::from_str(payload.as_str());
    match result {
        Ok(json_data) => match json_data["command"].as_str().unwrap() {
            "__browser_toggle_devtools" => {
                invokes::browser_toggle_devtools(window, label);
            }
            "__float_browser_action" => emit_browser_callback(
                window,
                json_data["key"].to_string(),
                serde_json::to_string(&json_data["params"])
                    .unwrap()
                    .as_str(),
            ),
            _ => {
                emit_browser_bar_command(window, label, payload);
            }
        },
        Err(e) => {
            println!("Failed to parse JSON: {}", e);
            return {};
        }
    };
}
