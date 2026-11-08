"use client";

import { useEffect } from "react";

import type { GarminActivitySummary } from "@/lib/garmin/types";
import { useGarminStore } from "@/store/useGarminStore";

type GarminSyncResponse = {
  activities?: GarminActivitySummary[];
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

        if (data.sessionExpired) {
          setSessionExpired(true);
          return;
        }

        if (Array.isArray(data.activities)) {
          setActivities(data.activities);
          setSessionExpired(false);
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
