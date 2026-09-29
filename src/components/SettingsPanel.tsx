import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSettings } from "../hooks/useSettings";
import type { UserSettings } from "../lib/types";

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [localInterval, setLocalInterval] = useState(settings.refresh_interval_ms);

  useEffect(() => {
    setLocalInterval(settings.refresh_interval_ms);
  }, [settings.refresh_interval_ms]);

  const handleIntervalChange = (value: number) => {
    setLocalInterval(value);
  };

  const handleIntervalCommit = () => {
    updateSettings({ refresh_interval_ms: localInterval });
  };

  return (
    <div className="flex flex-col gap-2.5 p-3 h-full">
      <div className="flex items-center justify-between pb-1 border-b border-border">
        <span className="text-xs font-semibold tracking-wider uppercase text-muted">
          Settings
        </span>
        <button
          onClick={onClose}
          className="text-muted hover:text-card-foreground transition-colors text-base leading-none p-1 rounded hover:bg-white/5 active:scale-95"
          aria-label="Close settings"
        >
          ✕
        </button>
      </div>

      {/* Refresh Interval */}
      <SettingRow label="Refresh Interval">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={500}
            max={5000}
            step={250}
            value={localInterval}
            onChange={(e) => handleIntervalChange(Number(e.target.value))}
            onMouseUp={handleIntervalCommit}
            onTouchEnd={handleIntervalCommit}
            className="w-20 accent-[var(--color-accent)] cursor-pointer"
          />
          <span className="text-[11px] tabular-nums text-card-foreground font-medium w-12 text-right">
            {localInterval >= 1000
              ? `${(localInterval / 1000).toFixed(1)}s`
              : `${localInterval}ms`}
          </span>
        </div>
      </SettingRow>

      {/* Theme */}
      <SettingRow label="Theme">
        <select
          value={settings.theme}
          onChange={(e) =>
            updateSettings({ theme: e.target.value as UserSettings["theme"] })
          }
          className="bg-black/20 text-card-foreground text-xs rounded px-2 py-1 border border-border outline-none cursor-pointer hover:border-[var(--color-border-hover)]"
        >
          <option value="system" className="bg-neutral-900 text-white">System</option>
          <option value="dark" className="bg-neutral-900 text-white">Dark</option>
          <option value="light" className="bg-neutral-100 text-black">Light</option>
        </select>
      </SettingRow>

      {/* Layout */}
      <SettingRow label="Layout">
        <select
          value={settings.layout}
          onChange={(e) =>
            updateSettings({ layout: e.target.value as UserSettings["layout"] })
          }
          className="bg-black/20 text-card-foreground text-xs rounded px-2 py-1 border border-border outline-none cursor-pointer hover:border-[var(--color-border-hover)]"
        >
          <option value="grid" className="bg-neutral-900 text-white">2×2 Grid</option>
          <option value="stacked" className="bg-neutral-900 text-white">Stacked (Tall)</option>
        </select>
      </SettingRow>

      {/* Launch on Startup */}
      <SettingRow label="Launch on Startup">
        <button
          onClick={() => updateSettings({ launch_on_startup: !settings.launch_on_startup })}
          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
            settings.launch_on_startup ? "bg-[var(--color-accent)]" : "bg-white/20"
          }`}
          role="switch"
          aria-checked={settings.launch_on_startup}
        >
          <span
            className={`block w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
              settings.launch_on_startup ? "translate-x-4.5" : "translate-x-0.75"
            }`}
          />
        </button>
      </SettingRow>

      <div className="mt-auto pt-2 flex items-center justify-between text-[10px] text-muted border-t border-border">
        <span>Glance v0.1.0</span>
        <button
          onClick={() => {
            try {
              getCurrentWindow().hide();
            } catch {
              window.close();
            }
          }}
          className="hover:text-card-foreground transition-colors cursor-pointer"
        >
          Close Flyout
        </button>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-card p-2.5 border border-border">
      <span className="text-xs text-card-foreground">{label}</span>
      {children}
    </div>
  );
}
