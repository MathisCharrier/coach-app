"use client";

import { AppHeader } from "@/components/layout/app-header";
import { useGarminAutoSync } from "@/hooks/use-garmin-auto-sync";

import { DailyActivity } from "./DailyActivity";
import { MetricsGrid } from "./MetricsGrid";
import { SportSlider } from "./SportSlider";

export function CyclingHomeDashboard() {
  useGarminAutoSync();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
        <AppHeader subtitle="Aujourd'hui" />
        <DailyActivity />
        <SportSlider />
        <MetricsGrid />
      </div>
    </div>
  );
}
