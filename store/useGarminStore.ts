"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { GarminActivitySummary, RoutePoint } from "@/lib/garmin/types";

type GarminState = {
  activities: GarminActivitySummary[];
  routes: Record<string, RoutePoint[]>;
  lastSyncedAt: string | null;
  sessionExpired: boolean;
  isSyncing: boolean;
  setActivities: (activities: GarminActivitySummary[]) => void;
  setRoute: (activityId: string, coordinates: RoutePoint[]) => void;
  setSessionExpired: (expired: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;
  clearActivities: () => void;
};

export const useGarminStore = create<GarminState>()(
  persist(
    (set) => ({
      activities: [],
      routes: {},
      lastSyncedAt: null,
      sessionExpired: false,
      isSyncing: false,
      setActivities: (activities) =>
        set({
          activities,
          lastSyncedAt: new Date().toISOString(),
          sessionExpired: false,
        }),
      setRoute: (activityId, coordinates) =>
        set((state) => ({
          routes: { ...state.routes, [activityId]: coordinates },
        })),
      setSessionExpired: (sessionExpired) => set({ sessionExpired }),
      setIsSyncing: (isSyncing) => set({ isSyncing }),
      clearActivities: () =>
        set({
          activities: [],
          routes: {},
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
