import { useState, useMemo } from "react";
import type { NetworkStats } from "../../lib/types";
import { formatBytes, formatThroughput } from "../../lib/format";
import { Sparkline } from "../Sparkline";
import { usePublicIp } from "../../hooks/usePublicIp";

interface NetworkDetailProps {
  network: NetworkStats;
  downHistory: number[];
  upHistory: number[];
}

type SortField = "total" | "rx" | "tx";
type SortOrder = "desc" | "asc";

export function NetworkDetail({ network, downHistory, upHistory }: NetworkDetailProps) {
  const { publicIp, loading: publicIpLoading } = usePublicIp();
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const maxDown = Math.max(1024, ...downHistory);
  const maxUp = Math.max(1024, ...upHistory);

  const rawApps = network.app_network || [];

  const sortedApps = useMemo(() => {
    const list = [...rawApps];
    list.sort((a, b) => {
      let valA = a.total_bytes;
      let valB = b.total_bytes;
      if (sortField === "rx") {
        valA = a.rx_bytes;
        valB = b.rx_bytes;
      } else if (sortField === "tx") {
        valA = a.tx_bytes;
        valB = b.tx_bytes;
      }
      return sortOrder === "desc" ? valB - valA : valA - valB;
    });
    return list;
  }, [rawApps, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortOrder === "desc" ? " ↓" : " ↑";
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Speed Throughput and Dual Graph Cards */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-3 border border-border">
        {/* Download row */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--color-accent)] font-bold text-xs">↓</span>
              <span className="text-xs text-muted">Download</span>
            </div>
            <span className="text-sm font-bold tabular-nums text-card-foreground">
              {formatThroughput(network.rx_bytes_per_sec)}
            </span>
          </div>
          <Sparkline
            data={downHistory}
            max={maxDown}
            width={340}
            height={38}
            strokeColor="var(--color-accent)"
          />
        </div>

        <div className="border-t border-border my-0.5" />

        {/* Upload row */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold text-xs">↑</span>
              <span className="text-xs text-muted">Upload</span>
            </div>
            <span className="text-sm font-bold tabular-nums text-card-foreground">
              {formatThroughput(network.tx_bytes_per_sec)}
            </span>
          </div>
          <Sparkline
            data={upHistory}
            max={maxUp}
            width={340}
            height={38}
            strokeColor="rgb(52, 211, 153)"
          />
        </div>
      </div>

      {/* Per-Application Network Usage Since Launch */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            App Network Usage (Since Launch)
          </span>
          {/* Sorting controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSort("rx")}
              className={`px-1.5 py-0.5 text-[9px] rounded font-medium transition-colors ${
                sortField === "rx"
                  ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-semibold"
                  : "text-muted hover:text-card-foreground bg-white/5"
              }`}
              title="Sort by Download"
            >
              Down{getSortIndicator("rx")}
            </button>
            <button
              onClick={() => handleSort("tx")}
              className={`px-1.5 py-0.5 text-[9px] rounded font-medium transition-colors ${
                sortField === "tx"
                  ? "bg-emerald-400/20 text-emerald-400 font-semibold"
                  : "text-muted hover:text-card-foreground bg-white/5"
              }`}
              title="Sort by Upload"
            >
              Up{getSortIndicator("tx")}
            </button>
            <button
              onClick={() => handleSort("total")}
              className={`px-1.5 py-0.5 text-[9px] rounded font-medium transition-colors ${
                sortField === "total"
                  ? "bg-white/15 text-card-foreground font-semibold"
                  : "text-muted hover:text-card-foreground bg-white/5"
              }`}
              title="Sort by Total"
            >
              Total{getSortIndicator("total")}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-[var(--radius-card)] bg-card p-2 border border-border max-h-48 overflow-y-auto">
          {sortedApps.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted">
              Monitoring application network activity…
            </div>
          ) : (
            sortedApps.slice(0, 15).map((app, idx) => (
              <div
                key={`${app.name}-${idx}`}
                className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-white/5 transition-colors text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] tabular-nums text-muted w-3 text-right">
                    {idx + 1}
                  </span>
                  {app.icon ? (
                    <img
                      src={app.icon}
                      alt=""
                      className="w-3.5 h-3.5 shrink-0 rounded-[2px] object-contain"
                    />
                  ) : (
                    <div className="w-3.5 h-3.5 shrink-0 rounded-[2px] bg-white/10 flex items-center justify-center text-[9px] text-muted">
                      ⚙
                    </div>
                  )}
                  <span
                    className="font-medium text-card-foreground truncate max-w-[130px]"
                    title={app.name}
                  >
                    {app.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 tabular-nums text-right shrink-0">
                  <span
                    className={`text-[10px] ${
                      sortField === "rx"
                        ? "text-[var(--color-accent)] font-semibold"
                        : "text-muted"
                    }`}
                    title={`Download: ${formatBytes(app.rx_bytes)}`}
                  >
                    ↓{formatBytes(app.rx_bytes)}
                  </span>
                  <span
                    className={`text-[10px] ${
                      sortField === "tx"
                        ? "text-emerald-400 font-semibold"
                        : "text-muted"
                    }`}
                    title={`Upload: ${formatBytes(app.tx_bytes)}`}
                  >
                    ↑{formatBytes(app.tx_bytes)}
                  </span>
                  <span
                    className={`font-semibold text-xs min-w-[50px] text-right ${
                      sortField === "total" ? "text-card-foreground" : "text-muted"
                    }`}
                    title={`Total: ${formatBytes(app.total_bytes)}`}
                  >
                    {formatBytes(app.total_bytes)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Network Configuration Details */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-3 border border-border text-xs">
        {/* Wi-Fi SSID / Interface */}
        <div className="flex items-center justify-between py-1 border-b border-border">
          <div className="flex items-center gap-1.5 text-muted">
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
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
            </svg>
            <span>Network / SSID</span>
          </div>
          <span className="font-semibold text-card-foreground truncate max-w-[180px]">
            {network.wifi_ssid || "Wi-Fi"}
          </span>
        </div>

        {/* Local IP */}
        <div className="flex items-center justify-between py-1 border-b border-border">
          <span className="text-muted">Local IP Address</span>
          <span className="font-semibold tabular-nums text-card-foreground">
            {network.local_ip || "127.0.0.1"}
          </span>
        </div>

        {/* Public IP */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-1.5 text-muted">
            <span>Public IP Address</span>
          </div>
          <span className="font-semibold tabular-nums text-card-foreground">
            {publicIp ? (
              publicIp
            ) : publicIpLoading ? (
              <span className="text-muted font-normal">Resolving…</span>
            ) : (
              <span className="text-muted font-normal">Unavailable</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
