"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type AthleteMetrics = {
  ftp?: number;
  vo2max?: number;
};

type AthleteState = {
  ftp: number;
  vo2max: number;
  setAthleteMetrics: (metrics: AthleteMetrics) => void;
};

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export const useAthleteStore = create<AthleteState>()(
  persist(
    (set) => ({
      ftp: 231,
      vo2max: 55,
      setAthleteMetrics: (metrics) =>
        set((state) => ({
          ftp: metrics.ftp ?? state.ftp,
          vo2max: metrics.vo2max ?? state.vo2max,
        })),
    }),
    {
      name: "coach-app-athlete",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persisted) => {
        const value =
          persisted && typeof persisted === "object"
            ? (persisted as Record<string, unknown>)
            : {};

        return {
          ftp: readNumber(value.ftp ?? value.ftpWatts, 231),
          vo2max: readNumber(value.vo2max ?? value.vo2Max, 55),
        };
      },
    }
  )
);
