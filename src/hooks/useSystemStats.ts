import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { SystemStats } from "../lib/types";
import { pushToBuffer } from "../lib/sparkline-buffer";

/**
 * Hook that subscribes to `system-stats` Tauri events and maintains
 * a sparkline ring buffer for CPU usage history.
 */
export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;

    listen<SystemStats>("system-stats", (event) => {
      if (!mounted) return;
      setStats(event.payload);
      setCpuHistory((prev) => pushToBuffer(prev, event.payload.cpu.usage_percent));
    }).then((unlisten) => {
      unlistenRef.current = unlisten;
    });

    return () => {
      mounted = false;
      unlistenRef.current?.();
    };
  }, []);

  return { stats, cpuHistory };
}
