# Glance

Glance is a lightweight system monitor for Windows. It runs in the system tray and opens a flyout panel.

## Features

Glance displays real-time hardware metrics in a compact flyout panel.

- CPU: Overall utilization percentage with a 60-second history chart.
- GPU: Utilization percentage for each physical graphics adapter.
- RAM: Used memory, total memory, and usage percentage.
- Network: Current upload and download speeds.

Click the tray icon to open the flyout panel.
Click outside the flyout panel to close it.
Hover over the tray icon to view current CPU and RAM values.

## Settings

Click the gear icon in the flyout panel to open settings.
The following options are available:

- Refresh Interval: Set update frequency between 500 milliseconds and 5 seconds.
- Theme: Select Light, Dark, or System mode.
- Layout: Select 2x2 Grid or Stacked view.
- Launch on Startup: Start Glance automatically when Windows starts.

## Prerequisites

Install the following tools before building the application:

- Node.js (version 18 or later)
- Rust and Cargo
- Microsoft Visual Studio C++ Build Tools

## Build and Run

Follow these steps to build and run Glance.

1. Install project dependencies.
```powershell
npm install
```

2. Start the development server.
```powershell
npm run tauri dev
```

3. Build the production release.
```powershell
npm run tauri build
```

The build command outputs the executable to `src-tauri/target/release`.
