# Glance

Glance is a fast, lightweight system monitor for Windows. Resident in the system tray, it opens a clean flyout panel delivering live hardware telemetry with drill-down detail views.

## Features

Glance displays real-time hardware metrics with a responsive overview grid and deep-dive detail views for each subsystem:

### Overview & Detail Views
- **CPU**:
  - Global utilization percentage and 60-second sparkline buffer.
  - Detail view: Per-core utilization breakdown and top 5 processes by CPU consumption with application icons.
- **GPU**:
  - Live utilization percentage per physical adapter via Windows PDH counters.
  - Automatically filters out virtual fallback adapters (e.g. Microsoft Basic Render Driver).
  - Detail view: Dedicated utilization history graphs for each discrete or integrated GPU.
- **Memory**:
  - Used memory, total memory, and real-time usage percentage.
  - Detail view: Expanded 60-second memory history and top 5 processes by RAM usage with application icons and formatted memory footprints.
- **Network**:
  - Aggregate upload and download bandwidth speeds with dual-line sparkline history.
  - Detail view: Dual transfer rate graphs, local IP address, active Wi-Fi network SSID, and **per-application network tracking** displaying cumulative upload, download, and total data transferred since launch (sortable by upload, download, or total).
- **Battery**:
  - Automatically detected on laptops and portable devices.
  - Reports battery charge percentage, charging status, and power source (AC mains vs. battery).

### Native Windows Experience
- **Windows 11 Mica Material**: Native blur and transparency without CSS emulation.
- **Quick Tray Access**: Click the tray icon to toggle the flyout; click outside to automatically dismiss.
- **Drill-down Navigation**: Tap any metric card to open its dedicated view with smooth transitions and quick back navigation.
- **Low Overhead**: Runs in user mode with no kernel drivers and no administrator privileges required.

## Settings & Customization

Click the gear icon in the flyout toolbar to configure Glance:

- **Refresh Interval**: Adjust polling frequency between 500 milliseconds and 5 seconds (default: 1000 ms).
- **Accent Color**: Choose from preset color swatches, use the full-spectrum color picker, or input custom hex values with instant, real-time updates.
- **Theme**: Toggle between Dark, Light, or System-following appearance.
- **Layout**: Switch between a 2×2 Grid or a vertical Stacked view.
- **Launch on Startup**: Automatically start Glance with Windows on login without elevated permissions.

## Architecture

- **Runtime**: Tauri 2.x (Rust backend + WebView frontend)
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion
- **Backend**: Rust with `sysinfo`, Windows Performance Data Helper (PDH) API, Windows Power API, and Win32 Shell API for native process icon resolution

## Prerequisites

Install the following tools before building the application:

- [Node.js](https://nodejs.org/) (version 18 or later)
- [Rust & Cargo](https://rustup.rs/) (stable toolchain)
- Microsoft Visual Studio C++ Build Tools (with the Desktop development with C++ workload)

## Build and Run

### Development
1. Install dependencies:
```powershell
npm install
```

2. Start the development server:
```powershell
npm run tauri dev
```

### Production Build
Build the standalone executable and Windows installers locally:
```powershell
npm run tauri build
```

The compiled release outputs:
- **Standalone Portable Executable**: `src-tauri/target/release/glance.exe`
- **NSIS Setup Installer**: `src-tauri/target/release/bundle/nsis/Glance_<version>_x64-setup.exe`
- **MSI Installer**: `src-tauri/target/release/bundle/msi/Glance_<version>_x64_en-US.msi`

To build only the standalone executable without packaging installers, pass `--no-bundle`:
```powershell
npm run tauri build -- --no-bundle
```

### Automated GitHub Releases
Glance includes a manual GitHub Actions release workflow (`.github/workflows/release.yml`). You can trigger it from the **Actions** tab on GitHub, specify a version tag, and it will build and publish the Windows installers directly to GitHub Releases.
