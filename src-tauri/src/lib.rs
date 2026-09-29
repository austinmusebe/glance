mod battery;
mod gpu_monitor;
mod icon_cache;
mod models;
mod network_tracker;
mod settings;
mod system_monitor;
mod tray;

use tauri::Manager;
use system_monitor::SystemMonitor;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .invoke_handler(tauri::generate_handler![
            settings::get_settings,
            settings::set_settings
        ])
        .setup(|app| {
            // Logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Hide window on blur (click outside)
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = window_clone.hide();
                    }
                });
            }

            // Set up tray icon
            tray::create_tray(app.handle())?;

            // Load settings for refresh interval and initial theme
            let settings = settings::get_settings(app.handle().clone());
            settings::apply_theme_to_window(app.handle(), &settings.theme);

            // Start system monitoring
            let monitor = SystemMonitor::new();
            monitor.start_polling(app.handle().clone(), settings.refresh_interval_ms);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
