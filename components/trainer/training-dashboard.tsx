"use client";

import { Bike } from "lucide-react";

import { TrainingSecondaryMetrics } from "@/components/trainer/training-secondary-metrics";
import { TrainingStatusBanner } from "@/components/trainer/training-status-banner";
import { WorkoutGenerator } from "@/components/workout/workout-generator";

export function TrainingDashboard() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.12_265)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.25_0.1_25)_0%,transparent_45%)] opacity-95"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.1_0_0)_92%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-8">
        <header className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bike className="size-4 text-primary" aria-hidden />
          <span className="font-medium tracking-wide text-primary uppercase">
            Coach App
          </span>
          <span className="text-border">·</span>
          <span>Entraînement indoor</span>
        </header>

        <TrainingStatusBanner />

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
          <div className="flex flex-col gap-6 lg:col-span-3">
            <TrainingSecondaryMetrics />
            <div className="hidden rounded-2xl border border-dashed border-border/50 bg-card/30 p-8 text-center text-sm text-muted-foreground lg:block">
              Zone d&apos;entraînement active — graphique de séance et suivi ERG
              à venir.
            </div>
          </div>

          <div className="lg:col-span-2">
            <WorkoutGenerator />
          </div>
        </div>
      </div>
    </div>
  );
}
