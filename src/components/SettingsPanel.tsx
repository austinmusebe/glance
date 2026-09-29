import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSettings } from "../hooks/useSettings";
import type { UserSettings } from "../lib/types";

interface SettingsPanelProps {
  onClose: () => void;
  settings?: UserSettings;
  updateSettings?: (partial: Partial<UserSettings>) => Promise<void>;
}

const ACCENT_PRESETS = [
  { name: "Blue", hex: "#3b82f6" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Purple", hex: "#8b5cf6" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Rose", hex: "#f43f5e" },
];

export function SettingsPanel({
  onClose,
  settings: propSettings,
  updateSettings: propUpdateSettings,
}: SettingsPanelProps) {
  const hookResult = useSettings();
  const settings = propSettings ?? hookResult.settings;
  const updateSettings = propUpdateSettings ?? hookResult.updateSettings;
  const [localInterval, setLocalInterval] = useState(settings.refresh_interval_ms);
  const [hexInput, setHexInput] = useState(settings.accent_color || "#3b82f6");

  useEffect(() => {
    setLocalInterval(settings.refresh_interval_ms);
  }, [settings.refresh_interval_ms]);

  useEffect(() => {
    setHexInput(settings.accent_color || "#3b82f6");
  }, [settings.accent_color]);

  const handleIntervalChange = (value: number) => {
    setLocalInterval(value);
  };

  const handleIntervalCommit = () => {
    updateSettings({ refresh_interval_ms: localInterval });
  };

  const handleHexChange = (val: string) => {
    setHexInput(val);
    let clean = val.trim();
    if (!clean.startsWith("#")) {
      clean = "#" + clean;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      updateSettings({ accent_color: clean.toLowerCase() });
    }
  };

  const currentHexClean = (hexInput.startsWith("#") ? hexInput : "#" + hexInput).toLowerCase();

  return (
    <div className="flex flex-col gap-2.5 p-3 h-full">
      <div className="flex items-center justify-between pb-1 border-b border-border">
        <span className="text-xs font-semibold tracking-wider uppercase text-muted">
          Settings
        </span>
        <button
          onClick={onClose}
          className="text-muted hover:text-card-foreground transition-colors text-base leading-none p-1 rounded hover:bg-[var(--color-item-hover)] active:scale-95 cursor-pointer"
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

      {/* Accent Color */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-2.5 border border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-card-foreground">Accent Color</span>
          <div className="flex items-center gap-2">
            {/* Custom Native Color Picker */}
            <div className="relative flex items-center cursor-pointer" title="Custom color picker">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/i.test(currentHexClean) ? currentHexClean : "#3b82f6"}
                onChange={(e) => handleHexChange(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent opacity-0 absolute inset-0 z-10"
              />
              <div
                className="w-4.5 h-4.5 rounded-full border border-border shadow-xs hover:scale-105 transition-transform flex items-center justify-center text-[10px]"
                style={{
                  background:
                    "conic-gradient(from 180deg at 50% 50%, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                }}
              />
            </div>

            {/* Hex Input */}
            <div className="flex items-center gap-1 bg-[var(--color-item-bg)] border border-border rounded px-1.5 py-0.5 focus-within:border-[var(--color-accent)] transition-colors">
              <span className="text-[10px] text-muted select-none">#</span>
              <input
                type="text"
                maxLength={6}
                value={hexInput.replace(/^#/, "")}
                onChange={(e) => handleHexChange(e.target.value)}
                className="w-14 uppercase text-[11px] font-mono text-card-foreground bg-transparent outline-none"
                placeholder="3B82F6"
              />
            </div>
          </div>
        </div>

        {/* Quick-pick Swatches */}
        <div className="flex items-center justify-between pt-0.5">
          {ACCENT_PRESETS.map((p) => {
            const isSelected = currentHexClean === p.hex.toLowerCase();
            return (
              <button
                key={p.hex}
                onClick={() => handleHexChange(p.hex)}
                className={`w-4.5 h-4.5 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                  isSelected ? "scale-115 ring-2 ring-[var(--color-card-foreground)] ring-offset-1 ring-offset-card" : "hover:scale-110"
                }`}
                style={{ backgroundColor: p.hex }}
                title={p.name}
                aria-label={`Select ${p.name}`}
              />
            );
          })}
        </div>
      </div>

      {/* Theme */}
      <SettingRow label="Theme">
        <select
          value={settings.theme}
          onChange={(e) =>
            updateSettings({ theme: e.target.value as UserSettings["theme"] })
          }
          className="bg-[var(--color-item-bg)] text-card-foreground text-xs rounded px-2 py-1 border border-border outline-none cursor-pointer hover:border-[var(--color-border-hover)] transition-colors"
        >
          <option value="system" className="bg-card text-card-foreground">System</option>
          <option value="dark" className="bg-card text-card-foreground">Dark</option>
          <option value="light" className="bg-card text-card-foreground">Light</option>
        </select>
      </SettingRow>

      {/* Layout */}
      <SettingRow label="Layout">
        <select
          value={settings.layout}
          onChange={(e) =>
            updateSettings({ layout: e.target.value as UserSettings["layout"] })
          }
          className="bg-[var(--color-item-bg)] text-card-foreground text-xs rounded px-2 py-1 border border-border outline-none cursor-pointer hover:border-[var(--color-border-hover)] transition-colors"
        >
          <option value="grid" className="bg-card text-card-foreground">2×2 Grid</option>
          <option value="stacked" className="bg-card text-card-foreground">Stacked (Tall)</option>
        </select>
      </SettingRow>

      {/* Launch on Startup */}
      <SettingRow label="Launch on Startup">
        <button
          onClick={() => updateSettings({ launch_on_startup: !settings.launch_on_startup })}
          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
            settings.launch_on_startup ? "bg-[var(--color-accent)]" : "bg-[var(--color-item-hover)] border border-border"
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
