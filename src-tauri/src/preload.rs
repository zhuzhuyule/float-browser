use std::env::consts::OS;
use std::path::PathBuf;

use tauri::{
    plugin::{Plugin, Result},
    AppHandle, Invoke, PageLoadPayload, RunEvent, Runtime, Window,
};

pub struct PreloadPlugin<R: Runtime> {
    invoke_handler: Box<dyn Fn(Invoke<R>) + Send + Sync>,
    app_dir: PathBuf,
    is_browser: bool,
}

impl<R: Runtime> PreloadPlugin<R> {
    pub fn new() -> Self {
        Self {
            invoke_handler: Box::new(tauri::generate_handler![]),
            app_dir: PathBuf::new(),
            is_browser: false,
        }
    }
}

impl<R: Runtime> Plugin<R> for PreloadPlugin<R> {
    fn name(&self) -> &'static str {
        "preload"
    }

    fn initialize(&mut self, app: &tauri::AppHandle<R>, _: serde_json::Value) -> Result<()> {
        self.app_dir = app.path_resolver().app_config_dir().unwrap();
        println!("config dir: {}", self.app_dir.display());
        println!(
            "cache dir: {}",
            app.path_resolver().app_cache_dir().unwrap().display()
        );
        println!(
            "data dir: {}",
            app.path_resolver().app_data_dir().unwrap().display()
        );
        Ok(())
    }

    fn initialization_script(&self) -> Option<String> {
        return Some(include_str!("scripts.js").replacen("{$platform$}", OS, 1));
    }

    fn created(&mut self, window: Window<R>) {
        self.is_browser = window.label().starts_with("browser");
    }

    fn on_page_load(&mut self, _window: Window<R>, _payload: PageLoadPayload) {}

    fn on_event(&mut self, _app: &AppHandle<R>, _event: &RunEvent) {}

    fn extend_api(&mut self, message: Invoke<R>) {
        (self.invoke_handler)(message)
    }
}
