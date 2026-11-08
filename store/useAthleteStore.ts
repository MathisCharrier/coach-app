"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type AthleteState = {
  ftpWatts: number;
  vo2Max: number;
};

export const useAthleteStore = create<AthleteState>()(
  persist(
    () => ({
      ftpWatts: 231,
      vo2Max: 55,
    }),
    {
      name: "coach-app-athlete",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
