use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};
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
    Some("#3b82f6".to_string())
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

/// Apply theme and window vibrancy (Mica / Acrylic) based on theme setting.
pub fn apply_theme_to_window<R: Runtime>(app: &AppHandle<R>, theme_str: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let is_dark = match theme_str {
            "light" => Some(false),
            "dark" => Some(true),
            _ => None,
        };

        if let Some(dark) = is_dark {
            let _ = window.set_theme(Some(if dark {
                tauri::Theme::Dark
            } else {
                tauri::Theme::Light
            }));
        } else {
            let _ = window.set_theme(None);
        }

        #[cfg(target_os = "windows")]
        {
            use window_vibrancy::{apply_acrylic, apply_mica};
            // Try Mica first (Win 11), fall back to Acrylic (Win 10)
            if apply_mica(&window, is_dark).is_err() {
                let color = match is_dark {
                    Some(false) => (245, 245, 245, 200),
                    _ => (18, 18, 18, 200),
                };
                let _ = apply_acrylic(&window, Some(color));
            }
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

    // Apply theme and window vibrancy
    apply_theme_to_window(&app, &settings.theme);

    Ok(())
}
