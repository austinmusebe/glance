use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_store::StoreExt;

const STORE_FILENAME: &str = "settings.json";
const SETTINGS_KEY: &str = "user_settings";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub refresh_interval_ms: u64,
    pub theme: String,
    pub launch_on_startup: bool,
    pub layout: String,
    #[serde(default = "default_accent_color")]
    pub accent_color: Option<String>,
}

fn default_accent_color() -> Option<String> {
    Some("#60a5fa".to_string())
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            refresh_interval_ms: 1000,
            theme: "system".to_string(),
            launch_on_startup: false,
            layout: "grid".to_string(),
            accent_color: default_accent_color(),
        }
    }
}

/// Load settings from the store, or return defaults.
#[tauri::command]
pub fn get_settings<R: Runtime>(app: AppHandle<R>) -> UserSettings {
    let store = app.store(STORE_FILENAME).ok();
    store
        .and_then(|s| {
            s.get(SETTINGS_KEY)
                .and_then(|v| serde_json::from_value(v).ok())
        })
        .unwrap_or_default()
}

/// Save settings to the store.
#[tauri::command]
pub fn set_settings<R: Runtime>(app: AppHandle<R>, settings: UserSettings) -> Result<(), String> {
    let store = app.store(STORE_FILENAME).map_err(|e| e.to_string())?;
    let value = serde_json::to_value(&settings).map_err(|e| e.to_string())?;
    store.set(SETTINGS_KEY, value);
    store.save().map_err(|e| e.to_string())?;

    // Apply autostart setting
    if settings.launch_on_startup {
        let _ = app.autolaunch().enable();
    } else {
        let _ = app.autolaunch().disable();
    }

    Ok(())
}
