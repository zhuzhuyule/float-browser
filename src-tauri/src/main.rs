// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

fn main() {
    tauri::Builder::default()
        // .invoke_handler(tauri::generate_handler![greet])
        // .on_page_load(|window, _| {
        //     window.eval("console.log('Hello from Rust!');let div = document.createElement('div'); div.innerText='测试'; div.style.position='absolute'; div.style.left=0; div.style.top=0; document.body.appendChild(div);")
        //         .expect("eval failed");
        // })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
