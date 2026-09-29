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

    pub fn get_icon_base64(&self, exe_path: &Path) -> Option<String> {
        let mut cache = self.cache.lock().unwrap();
        if let Some(cached) = cache.get(exe_path) {
            return cached.clone();
        }

        let icon_data = extract_icon_as_bmp_base64(exe_path);
        cache.insert(exe_path.to_path_buf(), icon_data.clone());
        icon_data
    }
}

#[cfg(target_os = "windows")]
fn extract_icon_as_bmp_base64(path: &Path) -> Option<String> {
    use windows::core::PCWSTR;
    use windows::Win32::Graphics::Gdi::{
        CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, GetObjectW, BITMAP, BITMAPINFO,
        BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use windows::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_SMALLICON};
    use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, ICONINFO};

    let wide_path: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();

    unsafe {
        let mut shfi = SHFILEINFOW::default();
        let res = SHGetFileInfoW(
            PCWSTR(wide_path.as_ptr()),
            windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES(0),
            Some(&mut shfi),
            size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_SMALLICON,
        );

        if res == 0 || shfi.hIcon.is_invalid() {
            return None;
        }

        let mut icon_info = ICONINFO::default();
        if GetIconInfo(shfi.hIcon, &mut icon_info).is_err() {
            let _ = DestroyIcon(shfi.hIcon);
            return None;
        }

        let mut bmp = BITMAP::default();
        if GetObjectW(
            icon_info.hbmColor.into(),
            size_of::<BITMAP>() as i32,
            Some(&mut bmp as *mut _ as *mut c_void),
        ) == 0
        {
            let _ = DeleteObject(icon_info.hbmColor.into());
            let _ = DeleteObject(icon_info.hbmMask.into());
            let _ = DestroyIcon(shfi.hIcon);
            return None;
        }

        let width = bmp.bmWidth;
        let height = bmp.bmHeight;
        if width <= 0 || height <= 0 {
            let _ = DeleteObject(icon_info.hbmColor.into());
            let _ = DeleteObject(icon_info.hbmMask.into());
            let _ = DestroyIcon(shfi.hIcon);
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
            icon_info.hbmColor,
            0,
            height as u32,
            Some(pixel_bytes.as_mut_ptr() as *mut c_void),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        let _ = DeleteDC(hdc);
        let _ = DeleteObject(icon_info.hbmColor.into());
        let _ = DeleteObject(icon_info.hbmMask.into());
        let _ = DestroyIcon(shfi.hIcon);

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

        // Construct BMP in memory
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
}
