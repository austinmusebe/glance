import { useState, useEffect } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { moveWindowConstrained, Position } from "@tauri-apps/plugin-positioner";
import { motion, AnimatePresence } from "framer-motion";
import { useSystemStats } from "../hooks/useSystemStats";
import { useSettings } from "../hooks/useSettings";
import type { MetricType } from "../lib/types";
import { CpuCard } from "./cards/CpuCard";
import { GpuCard } from "./cards/GpuCard";
import { RamCard } from "./cards/RamCard";
import { NetworkCard } from "./cards/NetworkCard";
import { BatteryCard } from "./cards/BatteryCard";
import { SettingsPanel } from "./SettingsPanel";
import { DetailView } from "./detail/DetailView";

export function FlyoutPanel() {
  const {
    stats,
    cpuHistory,
    ramHistory,
    netDownHistory,
    netUpHistory,
    gpuHistory,
  } = useSystemStats();
  const { settings, updateSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);

  // Dynamically adjust window size and position based on layout choice and battery presence
  useEffect(() => {
    async function updateLayout() {
      try {
        const appWindow = getCurrentWindow();
        const hasBattery = Boolean(stats?.battery);
        if (settings.layout === "stacked") {
          await appWindow.setSize(new LogicalSize(320, hasBattery ? 590 : 510));
        } else {
          await appWindow.setSize(new LogicalSize(380, hasBattery ? 510 : 430));
        }
        await moveWindowConstrained(Position.TrayCenter);
      } catch {
        // In browser testing or mock mode, ignore window resize failure
      }
    }
    updateLayout();
  }, [settings.layout, Boolean(stats?.battery)]);

  if (!stats && !showSettings) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-2 select-none">
        <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted">
          Connecting to system monitor…
        </span>
      </div>
    );
  }

  const isStacked = settings.layout === "stacked";

  return (
    <div className="flex flex-col h-full justify-between p-3 select-none relative overflow-hidden">
      <AnimatePresence mode="wait">
        {showSettings ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="h-full flex flex-col"
          >
            <SettingsPanel
              onClose={() => setShowSettings(false)}
              settings={settings}
              updateSettings={updateSettings}
            />
          </motion.div>
        ) : selectedMetric && stats ? (
          <motion.div
            key={`detail-${selectedMetric}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="h-full flex flex-col"
          >
            <DetailView
              metric={selectedMetric}
              stats={stats}
              cpuHistory={cpuHistory}
              ramHistory={ramHistory}
              netDownHistory={netDownHistory}
              netUpHistory={netUpHistory}
              gpuHistory={gpuHistory}
              onBack={() => setSelectedMetric(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex flex-col h-full justify-between"
          >
            <div
              className={
                isStacked
                  ? "flex flex-col gap-2 overflow-y-auto"
                  : "grid grid-cols-2 gap-2"
              }
            >
              {stats && (
                <>
                  <CpuCard
                    cpu={stats.cpu}
                    history={cpuHistory}
                    isStacked={isStacked}
                    onClick={() => setSelectedMetric("cpu")}
                  />
                  <GpuCard
                    gpus={stats.gpu}
                    onClick={() => setSelectedMetric("gpu")}
                  />
                  <RamCard
                    ram={stats.ram}
                    onClick={() => setSelectedMetric("ram")}
                  />
                  <NetworkCard
                    network={stats.network}
                    onClick={() => setSelectedMetric("network")}
                  />
                  {stats.battery && (
                    <BatteryCard
                      battery={stats.battery}
                      onClick={() => setSelectedMetric("battery")}
                    />
                  )}
                </>
              )}
            </div>

            {/* Flyout bottom toolbar */}
            <div className="flex items-center justify-between pt-2.5 px-0.5 mt-auto">
              <span className="text-[10px] text-muted tracking-tight">
                Glance
              </span>
              <button
                onClick={() => setShowSettings(true)}
                className="text-muted hover:text-card-foreground p-1 rounded transition-colors duration-150 hover:bg-[var(--color-item-hover)] active:scale-95 cursor-pointer"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
