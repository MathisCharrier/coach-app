"use client";

import type { LucideIcon } from "lucide-react";
import { Activity, Bike, Dumbbell, Footprints, HeartPulse } from "lucide-react";

import { useAthleteStore } from "@/store/useAthleteStore";
import { useWorkoutPlanStore } from "@/store/useWorkoutPlanStore";

export type SportView = "overview" | "cycling" | "running" | "strength" | "calendar";

function StatCard({
  title,
  value,
  unit,
  icon: Icon,
}: {
  title: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{title}</p>
        <Icon className="size-4 text-orange-500" aria-hidden />
      </div>
      <p className="mt-6 text-4xl font-medium tracking-tight text-zinc-900 tabular-nums">
        {value}
        {unit ? (
          <span className="ml-2 text-base font-normal text-zinc-500">{unit}</span>
        ) : null}
      </p>
    </article>
  );
}

export function StatsTiles({ view }: { view: SportView }) {
  const ftp = useAthleteStore((s) => s.ftp);
  const vo2max = useAthleteStore((s) => s.vo2max);
  const planned = useWorkoutPlanStore((s) => s.upcoming.length);

  if (view === "cycling") {
    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="FTP" value={String(ftp)} unit="W" icon={Bike} />
        <StatCard
          title="Séances vélo"
          value={String(planned)}
          unit="planifiées"
          icon={HeartPulse}
        />
      </section>
    );
  }

  if (view === "running") {
    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="VO₂ Max"
          value={String(vo2max)}
          unit="ml/kg/min"
          icon={Footprints}
        />
        <StatCard title="Allure" value="—" unit="min/km" icon={HeartPulse} />
      </section>
    );
  }

  if (view === "strength") {
    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Séances force" value="—" icon={Dumbbell} />
        <StatCard title="Charge" value="—" unit="kg" icon={Dumbbell} />
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard title="FTP" value={String(ftp)} unit="W" icon={Bike} />
      <StatCard
        title="VO₂ Max"
        value={String(vo2max)}
        unit="ml/kg/min"
        icon={HeartPulse}
      />
      <StatCard
        title="Séances"
        value={String(planned)}
        unit="à venir"
        icon={Activity}
      />
    </section>
  );
}
