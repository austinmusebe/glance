import { useState, useEffect } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useSystemStats } from "../hooks/useSystemStats";
import { useSettings } from "../hooks/useSettings";
import { CpuCard } from "./cards/CpuCard";
import { GpuCard } from "./cards/GpuCard";
import { RamCard } from "./cards/RamCard";
import { NetworkCard } from "./cards/NetworkCard";
import { SettingsPanel } from "./SettingsPanel";

export function FlyoutPanel() {
  const { stats, cpuHistory } = useSystemStats();
  const { settings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

  // Dynamically adjust window size based on layout choice
  useEffect(() => {
    try {
      const appWindow = getCurrentWindow();
      if (settings.layout === "stacked") {
        appWindow.setSize(new LogicalSize(320, 510));
      } else {
        appWindow.setSize(new LogicalSize(380, 430));
      }
    } catch {
      // In browser testing or mock mode, ignore window resize failure
    }
  }, [settings.layout]);

  if (showSettings) {
    return <SettingsPanel onClose={() => setShowSettings(false)} />;
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-2">
        <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted">
          Connecting to system monitor…
        </span>
      </div>
    );
  }

  const isStacked = settings.layout === "stacked";

  return (
    <div className="flex flex-col h-full justify-between p-3 select-none">
      <div
        className={
          isStacked
            ? "flex flex-col gap-2 overflow-y-auto"
            : "grid grid-cols-2 gap-2"
        }
      >
        <CpuCard cpu={stats.cpu} history={cpuHistory} isStacked={isStacked} />
        <GpuCard gpus={stats.gpu} />
        <RamCard ram={stats.ram} />
        <NetworkCard network={stats.network} />
      </div>

      {/* Flyout bottom toolbar */}
      <div className="flex items-center justify-between pt-2.5 px-0.5 mt-auto">
        <span className="text-[10px] text-muted tracking-tight">
          Glance
        </span>
        <button
          onClick={() => setShowSettings(true)}
          className="text-muted hover:text-card-foreground p-1 rounded transition-colors duration-150 hover:bg-white/5 active:scale-95 cursor-pointer"
          title="Settings"
          aria-label="Open settings"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
