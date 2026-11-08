"use client";

import Link from "next/link";

import { AppHeader } from "@/components/layout/app-header";
import { useGarminAutoSync } from "@/hooks/use-garmin-auto-sync";
import { useGarminStore } from "@/store/useGarminStore";

import { DailyActivity } from "./DailyActivity";
import { MetricsGrid } from "./MetricsGrid";
import { SportSlider } from "./SportSlider";

export function CyclingHomeDashboard() {
  useGarminAutoSync();
  const hasActivities = useGarminStore((state) => state.activities.length > 0);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
        <AppHeader subtitle="Aujourd'hui" />
        <DailyActivity />
        {hasActivities ? null : (
          <p className="rounded-3xl border border-gray-200 bg-white px-6 py-12 text-center text-sm leading-6 text-zinc-500 shadow-sm">
            Aucune donnée synchronisée. Rendez-vous dans le{" "}
            <Link href="/profile" className="font-medium text-orange-600 underline underline-offset-2">
              Profil
            </Link>{" "}
            pour lier votre compte Garmin.
          </p>
        )}
        <SportSlider />
        <MetricsGrid />
      </div>
    </div>
  );
}
