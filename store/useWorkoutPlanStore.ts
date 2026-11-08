"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type PlannedWorkout = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  totalDurationSeconds: number;
  intervalCount: number;
};

type WorkoutPlanState = {
  upcoming: PlannedWorkout[];
  addWorkout: (workout: Omit<PlannedWorkout, "id" | "createdAt">) => void;
};

export const useWorkoutPlanStore = create<WorkoutPlanState>()(
  persist(
    (set, get) => ({
      upcoming: [],
      addWorkout: (workout) => {
        const entry: PlannedWorkout = {
          ...workout,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };

        set({
          upcoming: [entry, ...get().upcoming].slice(0, 8),
        });
      },
    }),
    {
      name: "coach-app-workout-plan",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
