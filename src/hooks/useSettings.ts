import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { UserSettings } from "../lib/types";
import { DEFAULT_SETTINGS } from "../lib/types";

/**
 * Hook for reading and writing user settings via Tauri backend.
 */
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<UserSettings>("get_settings")
      .then((s) => setSettings(s))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateSettings = async (partial: Partial<UserSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    try {
      await invoke("set_settings", { settings: next });
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  return { settings, updateSettings, loading };
}
