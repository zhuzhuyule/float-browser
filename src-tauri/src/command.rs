use std::{clone, path::PathBuf};

use serde_json::Result;
use tauri::Manager;

use crate::invokes;

use tauri::Wry;
use tauri_plugin_store::{with_store, StoreCollection};

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
            payload.clone(),
        )
        .unwrap();
    browser_win
        .emit_to(
            format!("{}_request", label).as_str(),
            "__browser__command",
            payload,
        )
        .unwrap();
}

pub fn emit_browser_callback(win: tauri::Window, key: String, data: String) {
    win.eval(&format!(
        r#"
            (() => {{
                const event = new CustomEvent({}, {{ detail: {:?} }});
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
            "__get_cache" => emit_browser_callback(
                window.clone(),
                json_data["key"].to_string(),
                get_store(
                    window.clone(),
                    json_data["params"][0].to_string().replace("\"", ""),
                    json_data["params"][1].to_string().replace("\"", ""),
                )
                .unwrap()
                .to_string(),
            ),
            "__get_cache_request" => emit_browser_callback(
                window.clone(),
                json_data["key"].to_string(),
                get_store_request(
                    window.clone(),
                    json_data["params"][0].to_string().replace("\"", ""),
                    json_data["params"][1].to_string().replace("\"", ""),
                    json_data["params"][2].to_string().replace("\"", ""),
                )
                .unwrap()
                .to_string(),
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

fn get_store(window: tauri::Window, cache_file: String, key: String) -> Result<String> {
    let stores = window.state::<StoreCollection<Wry>>();
    let path = PathBuf::from(format!("request/{}.json", cache_file));
    let result = with_store(window.app_handle().clone(), stores, path.clone(), |store| {
        if store.has(key.clone()) {
            Ok(serde_json::to_string(store.get(key).unwrap())?)
        } else {
            Ok("".to_string())
        }
    })
    .unwrap();

    Ok(result)
}

fn get_store_request(
    window: tauri::Window,
    cache_file: String,
    api: String,
    page: String,
) -> Result<String> {
    let stores = window.state::<StoreCollection<Wry>>();
    let path = PathBuf::from(format!("request/{}.json", cache_file));
    let result = with_store(window.app_handle().clone(), stores, path.clone(), |store| {
        if let Some(urls) = store.get("urls").and_then(|urls| urls.as_array()) {
            if let Some(index) = urls
                .iter()
                .position(|item| item.as_str().map_or(false, |s| s == page))
            {
                if let Some(obj) = store.get(api.clone()) {
                    if let Some(pages) = obj["pages"].as_array() {
                        if let Some(page_obj) = pages.get(index) {
                            if let Some(path) = page_obj["path"].as_str() {
                                let point_path = format!("/method/{}", path.replace(".", "/"));
                                if let Some(res) = obj
                                    .clone()
                                    .pointer_mut(point_path.as_str())
                                    .and_then(|res| res.as_object_mut())
                                {
                                    let cache_path: Vec<&str> = path.split(".").collect();
                                    res.insert(
                                        "method".to_string(),
                                        serde_json::Value::String(
                                            cache_path.get(0).unwrap().to_string(),
                                        ),
                                    );
                                    res.insert(
                                        "status".to_string(),
                                        serde_json::Value::String(
                                            cache_path.get(1).unwrap().to_string(),
                                        ),
                                    );
                                    match serde_json::to_string(res) {
                                        Ok(rr) => return Ok(rr),
                                        Err(_) => return Ok("".to_string()),
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else {
            return Ok("".to_string());
        }
        Ok("".to_string())
    })
    .unwrap();

    Ok(result)
}
