import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { SystemStats } from "../lib/types";
import { pushToBuffer } from "../lib/sparkline-buffer";

/**
 * Hook that subscribes to `system-stats` Tauri events and maintains
 * sparkline ring buffers for CPU, RAM, Network, and per-adapter GPU usage history.
 */
export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [ramHistory, setRamHistory] = useState<number[]>([]);
  const [netDownHistory, setNetDownHistory] = useState<number[]>([]);
  const [netUpHistory, setNetUpHistory] = useState<number[]>([]);
  const [gpuHistory, setGpuHistory] = useState<Record<string, number[]>>({});
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;

    listen<SystemStats>("system-stats", (event) => {
      if (!mounted) return;
      const payload = event.payload;
      setStats(payload);
      setCpuHistory((prev) => pushToBuffer(prev, payload.cpu.usage_percent));
      setRamHistory((prev) => pushToBuffer(prev, payload.ram.usage_percent));
      setNetDownHistory((prev) => pushToBuffer(prev, payload.network.rx_bytes_per_sec));
      setNetUpHistory((prev) => pushToBuffer(prev, payload.network.tx_bytes_per_sec));

      setGpuHistory((prev) => {
        const next = { ...prev };
        for (const gpu of payload.gpu) {
          next[gpu.id] = pushToBuffer(prev[gpu.id] || [], gpu.usage_percent);
        }
        return next;
      });
    }).then((unlisten) => {
      unlistenRef.current = unlisten;
    });

    return () => {
      mounted = false;
      unlistenRef.current?.();
    };
  }, []);

  return { stats, cpuHistory, ramHistory, netDownHistory, netUpHistory, gpuHistory };
}
