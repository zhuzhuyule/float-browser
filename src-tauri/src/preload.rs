use std::env::consts::OS;
use std::path::PathBuf;

use tauri::{
    plugin::{Plugin, Result},
    Invoke, Runtime,
};

pub struct PreloadPlugin<R: Runtime> {
    invoke_handler: Box<dyn Fn(Invoke<R>) + Send + Sync>,
    app_dir: PathBuf,
}

impl<R: Runtime> PreloadPlugin<R> {
    pub fn new() -> Self {
        Self {
            invoke_handler: Box::new(tauri::generate_handler![]),
            app_dir: PathBuf::new(),
        }
    }
}

impl<R: Runtime> Plugin<R> for PreloadPlugin<R> {
    fn name(&self) -> &'static str {
        "preload"
    }

    fn initialize(&mut self, app: &tauri::AppHandle<R>, _: serde_json::Value) -> Result<()> {
        self.app_dir = app.path_resolver().app_config_dir().unwrap();
        Ok(())
    }

    fn initialization_script(&self) -> Option<String> {
        Some(format!(
            r#"
              console.log('inject success other {} {}');
            "#,
            OS,
            self.app_dir.display()
        ))
    }

    fn extend_api(&mut self, message: Invoke<R>) {
        (self.invoke_handler)(message)
    }
}
