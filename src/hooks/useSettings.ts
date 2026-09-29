import { useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { UserSettings } from "../lib/types";
import { DEFAULT_SETTINGS } from "../lib/types";

let currentSettings: UserSettings = DEFAULT_SETTINGS;
let isLoaded = false;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function applyAccentColor(hexColor?: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const hex = (hexColor || DEFAULT_SETTINGS.accent_color || "#60a5fa").trim();
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;

  if (/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    root.style.setProperty("--color-accent", `rgb(${r}, ${g}, ${b})`);
    root.style.setProperty("--color-accent-dim", `rgba(${r}, ${g}, ${b}, 0.2)`);
  }
}

export function applyTheme(theme: "light" | "dark" | "system") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  let isDark = true;
  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia) {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  } else {
    isDark = theme === "dark";
  }

  if (isDark) {
    root.classList.remove("light");
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}

// Initial fetch from Tauri backend
if (typeof window !== "undefined") {
  invoke<UserSettings>("get_settings")
    .then((s) => {
      currentSettings = { ...DEFAULT_SETTINGS, ...s };
      isLoaded = true;
      applyAccentColor(currentSettings.accent_color);
      applyTheme(currentSettings.theme);
      emitChange();
    })
    .catch((err) => {
      console.warn("Could not load settings from backend (using defaults):", err);
      applyAccentColor(currentSettings.accent_color);
      applyTheme(currentSettings.theme);
    });

  if (window.matchMedia) {
    try {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
          if (currentSettings.theme === "system") {
            applyTheme("system");
          }
        });
    } catch {
      // Ignore if matchMedia listener fails in mock environments
    }
  }
}

export async function updateSettings(partial: Partial<UserSettings>) {
  currentSettings = { ...currentSettings, ...partial };
  if (partial.accent_color) {
    applyAccentColor(partial.accent_color);
  }
  if (partial.theme) {
    applyTheme(partial.theme);
  }
  emitChange();

  try {
    await invoke("set_settings", { settings: currentSettings });
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}

/**
 * Hook for reading and writing user settings via Tauri backend.
 * Uses a synchronized store so all components re-render immediately
 * when settings change without requiring an app restart.
 */
export function useSettings() {
  const settings = useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => currentSettings,
    () => DEFAULT_SETTINGS
  );

  return { settings, updateSettings, loading: !isLoaded };
}
