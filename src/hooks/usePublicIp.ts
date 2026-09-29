import { useEffect, useState } from "react";

/**
 * Hook that fetches public IP once on mount and refreshes on a slow interval (every 5 minutes).
 * This is a narrow, deliberate exception to offline-only monitoring per the Glance specification.
 */
export function usePublicIp() {
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPublicIp() {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        if (response.ok) {
          const data = await response.json();
          if (!cancelled && data.ip) {
            setPublicIp(data.ip);
          }
        }
      } catch {
        // Fallback to secondary endpoint
        try {
          const fallback = await fetch("https://ifconfig.me/ip");
          if (fallback.ok) {
            const text = (await fallback.text()).trim();
            if (!cancelled && text) {
              setPublicIp(text);
            }
          }
        } catch {
          // Offline or network unreachable
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPublicIp();

    // Slow refresh interval: 5 minutes
    const timer = setInterval(fetchPublicIp, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { publicIp, loading };
}
