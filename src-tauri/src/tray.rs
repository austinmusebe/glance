use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};
use tauri_plugin_positioner::{Position, WindowExt};

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let quit_i = MenuItem::with_id(app, "quit", "Quit Glance", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit_i])?;

    let icon = Image::from_bytes(include_bytes!("../icons/32x32.png"))
        .ok()
        .or_else(|| app.default_window_icon().cloned())
        .expect("tray icon must be set in tauri.conf.json or embedded");

    TrayIconBuilder::with_id("main")
        .icon(icon)
        .tooltip("Glance — System Monitor")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.destroy();
                }
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.move_window_constrained(Position::TrayCenter);
                        if let Ok(mut pos) = window.outer_position() {
                            let scale_factor = window.scale_factor().unwrap_or(1.0);
                            let margin = (10.0 * scale_factor) as i32;
                            pos.y -= margin;
                            pos.x -= margin;
                            let _ = window.set_position(pos);
                        }
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
