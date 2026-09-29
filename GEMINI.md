# Glance — Windows Tray System Monitor

Mac-like menu-bar system monitor for Windows: tray-resident, click to open a flyout panel with live CPU/GPU/RAM/network readouts.

## Stack

- **Runtime**: Tauri 2.x (Rust backend + WebView frontend)
- **Frontend**: React 19 + TypeScript 5 + Vite 6 + Tailwind CSS 4 + shadcn/ui
- **Backend**: Rust with `sysinfo` (CPU/RAM/network) + Windows PDH API via `windows` crate (GPU Engine counters)
- **Window effects**: `window-vibrancy` crate for Mica (Win 11) / Acrylic (Win 10) fallback
- **Persistence**: `tauri-plugin-store` for user settings
- **Positioning**: `tauri-plugin-positioner` for tray-relative flyout placement
- **Autostart**: `tauri-plugin-autostart` for launch-on-startup

## Data Model

### SystemStats (emitted via Tauri event every refresh interval)
- `cpu.usage_percent`: 0-100 global CPU usage
- `gpu[]`: Array of `{ id, name, usage_percent }` per adapter — sourced from PDH `GPU Engine` counters with registry LUID→friendly-name resolution
- `ram`: `{ used_bytes, total_bytes, usage_percent }`
- `network`: `{ rx_bytes_per_sec, tx_bytes_per_sec }` — aggregate across all interfaces

### UserSettings (persisted JSON)
- `refresh_interval_ms`: default 1000
- `theme`: "light" | "dark" | "system"
- `launch_on_startup`: boolean
- `layout`: "grid" | "stacked"

## Design Principles

- **Mica material**: `transparent: true`, no decorations, native Win 11 blur — not CSS hacks
- **Dense & minimal**: mac-menu-bar aesthetic, generous rounded corners, restrained motion
- **Animate only**: value changes (number transitions) and panel open/close — nothing decorative
- **Component sources**: shadcn/ui base → reui.io, coss.com/ui patterns → transitions.dev, beui.dev, beautifului.dev, rareui.com polish
- **Restraint filter**: emilkowal.ski/ui/you-dont-need-animations
- **QA**: designsystemchecklist.com

## Architecture

- Rust background thread polls metrics at configured interval
- Emits `system-stats` Tauri event to frontend
- Frontend maintains 60-point sparkline ring buffer (in-memory)
- Tray click toggles flyout visibility via `tauri-plugin-positioner`
- Settings persisted via `tauri-plugin-store`, autostart via `tauri-plugin-autostart`

## Key Constraints

- No kernel driver, no elevated permissions
- No temperature sensors (needs deeper hardware access)
- No per-process breakdown
- Windows-only target
- Agent must NOT run `npm run tauri dev` — user runs it manually
