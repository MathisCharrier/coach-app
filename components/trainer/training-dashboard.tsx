"use client";

import { TrainingSecondaryMetrics } from "@/components/trainer/training-secondary-metrics";
import { TrainingStatusBanner } from "@/components/trainer/training-status-banner";
import { WorkoutGenerator } from "@/components/workout/workout-generator";
import { AppHeader } from "@/components/layout/app-header";

export function TrainingDashboard() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-8">
        <AppHeader subtitle="Cyclisme · home trainer" backHome />

        <TrainingStatusBanner />

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
          <div className="lg:col-span-2">
            <TrainingSecondaryMetrics />
          </div>
          <div className="lg:col-span-3">
            <WorkoutGenerator />
          </div>
        </div>
      </div>
    </div>
  );
}
