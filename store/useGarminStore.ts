"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { GarminActivitySummary } from "@/lib/garmin/types";

type GarminState = {
  activities: GarminActivitySummary[];
  lastSyncedAt: string | null;
  sessionExpired: boolean;
  isSyncing: boolean;
  setActivities: (activities: GarminActivitySummary[]) => void;
  setSessionExpired: (expired: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;
  clearActivities: () => void;
};

export const useGarminStore = create<GarminState>()(
  persist(
    (set) => ({
      activities: [],
      lastSyncedAt: null,
      sessionExpired: false,
      isSyncing: false,
      setActivities: (activities) =>
        set({
          activities,
          lastSyncedAt: new Date().toISOString(),
          sessionExpired: false,
        }),
      setSessionExpired: (sessionExpired) => set({ sessionExpired }),
      setIsSyncing: (isSyncing) => set({ isSyncing }),
      clearActivities: () =>
        set({
          activities: [],
          lastSyncedAt: null,
          sessionExpired: false,
        }),
    }),
    {
      name: "coach-app-garmin",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activities: state.activities,
        lastSyncedAt: state.lastSyncedAt,
        sessionExpired: state.sessionExpired,
      }),
    }
  )
);
