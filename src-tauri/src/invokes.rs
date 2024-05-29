use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/v1/gulabeles/features/command
#[tauri::command]
pub fn browser_navigate(window: tauri::Window, label: String, url: String) {
    println!("{} {}", label, url);
    let browser = window.get_window(label.as_str()).unwrap();

    browser
        .eval(&format!(r#"window.location.href="{}""#, url))
        .expect("navigate failed");
}

#[tauri::command]
pub fn browser_update_cache(window: tauri::Window, label: String, open: String, list: String) {
    let browser = window.get_window(label.as_str()).unwrap();

    browser
        .eval(&format!(
            r#"window.setUseCache({});/*window.updateCacheList({})*/;location.reload()"#,
            open, list
        ))
        .expect("navigate failed");
}

#[tauri::command]
pub fn browser_toggle_devtools(window: tauri::Window, label: String) {
    let browser = window.get_window(label.as_str()).unwrap();
    if browser.is_devtools_open() {
        browser.close_devtools();
    } else {
        browser.open_devtools();
    }
}

#[tauri::command]
pub fn browser_execute_action(window: tauri::Window, label: String, action: String) {
    let browser = window.get_window(label.as_str()).unwrap();

    let action_str = match action.as_str() {
        "reload" => r#"location.reload()"#,
        "back" => r#"history.back()"#,
        "forward" => r#"history.forward()"#,
        _ => "",
    };

    if !action_str.is_empty() {
        browser
            .eval(&format!("{}", action_str))
            .expect("navigate failed");
    }
}
