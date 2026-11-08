"use client";

import { useEffect } from "react";

import type { GarminActivitySummary } from "@/lib/garmin/types";
import { useGarminStore } from "@/store/useGarminStore";

type GarminSyncResponse = {
  activities?: GarminActivitySummary[];
  connected?: boolean;
  sessionExpired?: boolean;
};

export function useGarminAutoSync() {
  const setActivities = useGarminStore((s) => s.setActivities);
  const setSessionExpired = useGarminStore((s) => s.setSessionExpired);
  const setIsSyncing = useGarminStore((s) => s.setIsSyncing);
  const isSyncing = useGarminStore((s) => s.isSyncing);

  useEffect(() => {
    let cancelled = false;

    async function refreshSilently() {
      const current = useGarminStore.getState();
      const syncedAt = current.lastSyncedAt
        ? Date.parse(current.lastSyncedAt)
        : Number.NaN;
      if (Number.isFinite(syncedAt) && Date.now() - syncedAt < 60_000) {
        return;
      }

      setIsSyncing(true);

      try {
        const response = await fetch("/api/garmin", {
          method: "GET",
          credentials: "include",
        });

        const data = (await response.json()) as GarminSyncResponse;

        if (cancelled) {
          return;
        }

        if (data.connected && Array.isArray(data.activities)) {
          setActivities(data.activities);
          setSessionExpired(false);
          return;
        }

        if (data.sessionExpired) {
          setSessionExpired(true);
        }
      } catch {
        if (!cancelled) {
          setSessionExpired(false);
        }
      } finally {
        if (!cancelled) {
          setIsSyncing(false);
        }
      }
    }

    void refreshSilently();

    return () => {
      cancelled = true;
    };
  }, [setActivities, setIsSyncing, setSessionExpired]);

  return { isSyncing };
}
