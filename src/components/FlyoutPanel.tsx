import { useSystemStats } from "../hooks/useSystemStats";
import { CpuCard } from "./cards/CpuCard";
import { GpuCard } from "./cards/GpuCard";
import { RamCard } from "./cards/RamCard";
import { NetworkCard } from "./cards/NetworkCard";

export function FlyoutPanel() {
  const { stats, cpuHistory } = useSystemStats();

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-muted animate-pulse">
          Connecting…
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      <CpuCard cpu={stats.cpu} history={cpuHistory} />
      <GpuCard gpus={stats.gpu} />
      <RamCard ram={stats.ram} />
      <NetworkCard network={stats.network} />
    </div>
  );
}
