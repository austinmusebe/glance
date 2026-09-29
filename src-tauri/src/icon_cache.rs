use std::collections::HashMap;
use std::ffi::c_void;
use std::mem::size_of;
use std::os::windows::ffi::OsStrExt;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use base64::Engine;

#[derive(Clone, Default)]
pub struct IconCache {
    cache: Arc<Mutex<HashMap<PathBuf, Option<String>>>>,
}

impl IconCache {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Retrieve base64 BMP icon by executable path
    pub fn get_icon_base64(&self, exe_path: &Path) -> Option<String> {
        let mut cache = self.cache.lock().unwrap();
        if let Some(cached) = cache.get(exe_path) {
            return cached.clone();
        }

        let icon_data = extract_icon_as_bmp_base64(exe_path);
        cache.insert(exe_path.to_path_buf(), icon_data.clone());
        icon_data
    }

    /// Retrieve icon for a process, trying executable path first, then falling back
    /// to resolving by process name via System32, Windows, and App Paths registry.
    pub fn get_icon(&self, exe_path: Option<&Path>, proc_name: &str) -> Option<String> {
        if let Some(path) = exe_path {
            if path.exists() {
                if let Some(icon) = self.get_icon_base64(path) {
                    return Some(icon);
                }
            }
        }

        // Check if we already cached this process name
        let name_key = PathBuf::from(proc_name);
        {
            let cache = self.cache.lock().unwrap();
            if let Some(cached) = cache.get(&name_key) {
                return cached.clone();
            }
        }

        // Try to resolve the executable path from name
        if let Some(resolved_path) = resolve_executable_path(proc_name) {
            let icon = self.get_icon_base64(&resolved_path);
            let mut cache = self.cache.lock().unwrap();
            cache.insert(name_key, icon.clone());
            return icon;
        }

        // Cache failure so we don't repeatedly check disk
        let mut cache = self.cache.lock().unwrap();
        cache.insert(name_key, None);
        None
    }
}

fn resolve_executable_path(name: &str) -> Option<PathBuf> {
    let clean_name = name.trim();
    if clean_name.is_empty() {
        return None;
    }

    let name_with_exe = if clean_name.to_lowercase().ends_with(".exe") {
        clean_name.to_string()
    } else {
        format!("{}.exe", clean_name)
    };

    // 1. Check System32
    let sys32 = PathBuf::from(r"C:\Windows\System32").join(&name_with_exe);
    if sys32.exists() {
        return Some(sys32);
    }

    // 2. Check Windows root
    let win = PathBuf::from(r"C:\Windows").join(&name_with_exe);
    if win.exists() {
        return Some(win);
    }

    // 3. Check App Paths registry
    #[cfg(target_os = "windows")]
    if let Some(path) = get_app_path_from_registry(&name_with_exe) {
        return Some(path);
    }

    None
}

#[cfg(target_os = "windows")]
fn get_app_path_from_registry(exe_name: &str) -> Option<PathBuf> {
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE,
        KEY_READ, REG_SZ,
    };

    let subkey = format!(r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\{}", exe_name);
    let wide_subkey: Vec<u16> = subkey.encode_utf16().chain(Some(0)).collect();

    for root in [HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE] {
        unsafe {
            let mut hkey = HKEY::default();
            if RegOpenKeyExW(root, PCWSTR(wide_subkey.as_ptr()), Some(0), KEY_READ, &mut hkey).is_ok() {
                let mut buf = [0u16; 512];
                let mut size = (buf.len() * 2) as u32;
                let mut val_type = REG_SZ;
                let query_res = RegQueryValueExW(
                    hkey,
                    PCWSTR::null(),
                    None,
                    Some(&mut val_type),
                    Some(buf.as_mut_ptr() as *mut u8),
                    Some(&mut size),
                );
                let _ = RegCloseKey(hkey);
                if query_res.is_ok() && size > 2 {
                    let len = (size as usize / 2).saturating_sub(1);
                    let s = String::from_utf16_lossy(&buf[..len]);
                    let trimmed = s.trim_matches('"').trim();
                    let path = PathBuf::from(trimmed);
                    if path.exists() {
                        return Some(path);
                    }
                }
            }
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
fn get_app_path_from_registry(_exe_name: &str) -> Option<PathBuf> {
    None
}

#[cfg(target_os = "windows")]
fn extract_icon_as_bmp_base64(path: &Path) -> Option<String> {
    use windows::core::PCWSTR;
    use windows::Win32::Graphics::Gdi::{
        CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, GetObjectW, BITMAP, BITMAPINFO,
        BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use windows::Win32::UI::Shell::{
        ExtractIconExW, SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_SMALLICON,
    };
    use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, HICON, ICONINFO};

    let wide_path: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();

    unsafe {
        // Try SHGetFileInfoW first
        let mut hicon = HICON::default();
        let mut shfi = SHFILEINFOW::default();
        let res = SHGetFileInfoW(
            PCWSTR(wide_path.as_ptr()),
            windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES(0),
            Some(&mut shfi),
            size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_SMALLICON,
        );

        if res != 0 && !shfi.hIcon.is_invalid() {
            hicon = shfi.hIcon;
        } else {
            // Fallback to ExtractIconExW
            let mut small_icon = HICON::default();
            let count = ExtractIconExW(
                PCWSTR(wide_path.as_ptr()),
                0,
                None,
                Some(&mut small_icon),
                1,
            );
            if count > 0 && !small_icon.is_invalid() {
                hicon = small_icon;
            }
        }

        if hicon.is_invalid() {
            return None;
        }

        let mut icon_info = ICONINFO::default();
        if GetIconInfo(hicon, &mut icon_info).is_err() {
            let _ = DestroyIcon(hicon);
            return None;
        }

        let target_bmp = if !icon_info.hbmColor.is_invalid() {
            icon_info.hbmColor
        } else {
            icon_info.hbmMask
        };

        let mut bmp = BITMAP::default();
        if GetObjectW(
            target_bmp.into(),
            size_of::<BITMAP>() as i32,
            Some(&mut bmp as *mut _ as *mut c_void),
        ) == 0
        {
            let _ = DeleteObject(icon_info.hbmColor.into());
            let _ = DeleteObject(icon_info.hbmMask.into());
            let _ = DestroyIcon(hicon);
            return None;
        }

        let width = bmp.bmWidth;
        let height = bmp.bmHeight;
        if width <= 0 || height <= 0 {
            let _ = DeleteObject(icon_info.hbmColor.into());
            let _ = DeleteObject(icon_info.hbmMask.into());
            let _ = DestroyIcon(hicon);
            return None;
        }

        let hdc = CreateCompatibleDC(None);
        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: height, // standard bottom-up DIB
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                biSizeImage: (width * height * 4) as u32,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [windows::Win32::Graphics::Gdi::RGBQUAD::default()],
        };

        let mut pixel_bytes = vec![0u8; (width * height * 4) as usize];
        let lines_copied = GetDIBits(
            hdc,
            target_bmp,
            0,
            height as u32,
            Some(pixel_bytes.as_mut_ptr() as *mut c_void),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        let _ = DeleteDC(hdc);
        let _ = DeleteObject(icon_info.hbmColor.into());
        let _ = DeleteObject(icon_info.hbmMask.into());
        let _ = DestroyIcon(hicon);

        if lines_copied == 0 {
            return None;
        }

        // If alpha is entirely 0, set alpha channel to 255 (opaque)
        let has_alpha = pixel_bytes.chunks_exact(4).any(|c| c[3] > 0);
        if !has_alpha {
            for chunk in pixel_bytes.chunks_exact_mut(4) {
                chunk[3] = 255;
            }
        }

        // Construct standard BMP in memory
        let file_header_size = 14u32;
        let info_header_size = 40u32;
        let total_file_size = file_header_size + info_header_size + (pixel_bytes.len() as u32);

        let mut bmp_data = Vec::with_capacity(total_file_size as usize);
        // BITMAPFILEHEADER
        bmp_data.extend_from_slice(b"BM");
        bmp_data.extend_from_slice(&total_file_size.to_le_bytes());
        bmp_data.extend_from_slice(&0u32.to_le_bytes()); // Reserved
        bmp_data.extend_from_slice(&(file_header_size + info_header_size).to_le_bytes()); // bfOffBits

        // BITMAPINFOHEADER
        bmp_data.extend_from_slice(&info_header_size.to_le_bytes());
        bmp_data.extend_from_slice(&width.to_le_bytes());
        bmp_data.extend_from_slice(&height.to_le_bytes());
        bmp_data.extend_from_slice(&1u16.to_le_bytes()); // biPlanes
        bmp_data.extend_from_slice(&32u16.to_le_bytes()); // biBitCount
        bmp_data.extend_from_slice(&0u32.to_le_bytes()); // BI_RGB
        bmp_data.extend_from_slice(&(pixel_bytes.len() as u32).to_le_bytes()); // biSizeImage
        bmp_data.extend_from_slice(&0u32.to_le_bytes()); // biXPelsPerMeter
        bmp_data.extend_from_slice(&0u32.to_le_bytes()); // biYPelsPerMeter
        bmp_data.extend_from_slice(&0u32.to_le_bytes()); // biClrUsed
        bmp_data.extend_from_slice(&0u32.to_le_bytes()); // biClrImportant

        // Pixels
        bmp_data.extend_from_slice(&pixel_bytes);

        let b64 = base64::engine::general_purpose::STANDARD.encode(&bmp_data);
        Some(format!("data:image/bmp;base64,{}", b64))
    }
}

#[cfg(not(target_os = "windows"))]
fn extract_icon_as_bmp_base64(_path: &Path) -> Option<String> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_explorer_icon_extraction() {
        let explorer = Path::new(r"C:\Windows\explorer.exe");
        if explorer.exists() {
            let cache = IconCache::new();
            let icon = cache.get_icon_base64(explorer);
            assert!(icon.is_some(), "Should extract icon for explorer.exe");
            let icon_str = icon.unwrap();
            assert!(icon_str.starts_with("data:image/bmp;base64,"));
        }
    }

    #[test]
    fn test_sysinfo_process_icon_extraction() {
        let mut sys = sysinfo::System::new();
        sys.refresh_processes_specifics(
            sysinfo::ProcessesToUpdate::All,
            true,
            sysinfo::ProcessRefreshKind::nothing().with_exe(sysinfo::UpdateKind::OnlyIfNotSet),
        );
        let cache = IconCache::new();
        let mut found_icon = false;
        for (_pid, proc) in sys.processes() {
            let icon = cache.get_icon(proc.exe(), &proc.name().to_string_lossy());
            if icon.is_some() {
                found_icon = true;
                break;
            }
        }
        assert!(found_icon, "Should extract icon from at least one running process");
    }

    #[test]
    fn test_resolve_by_name() {
        let cache = IconCache::new();
        let icon = cache.get_icon(None, "explorer.exe");
        assert!(icon.is_some(), "Should resolve explorer.exe even with None exe path");
    }
}
