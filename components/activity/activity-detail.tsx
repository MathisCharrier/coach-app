"use client";

import { ArrowLeft, Gauge, Heart, Map, Mountain, Route, Zap } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { sportFromTitle, type SportKind } from "@/components/dashboard/sport-kind";
import { useGarminStore } from "@/store/useGarminStore";
import { useWorkoutPlanStore } from "@/store/useWorkoutPlanStore";

type ActivityDetailProps = {
  params: Promise<{ id: string }>;
};

const SPORT_LABEL: Record<SportKind, string> = {
  cycling: "Cyclisme",
  running: "Course à pied",
  strength: "Musculation",
  other: "Séance",
};

function isOutdoorRun(title: string): boolean {
  return !/tapis|indoor|home|salle/.test(title.toLowerCase());
}

function showsMap(sport: SportKind, title: string): boolean {
  if (sport === "cycling") {
    return true;
  }

  return sport === "running" && isOutdoorRun(title);
}

export function ActivityDetail({ params }: ActivityDetailProps) {
  const { id } = use(params);
  const activities = useGarminStore((state) => state.activities);
  const upcoming = useWorkoutPlanStore((state) => state.upcoming);

  const garmin = activities.find((activity) => String(activity.id) === id);
  const planned = upcoming.find((workout) => workout.id === id);
  const title = garmin?.title ?? planned?.title ?? "Séance";
  const sport = sportFromTitle(
    title,
    garmin ? "cycling" : planned ? "cycling" : "other"
  );
  const averageWatts = garmin?.averagePowerWatts ?? null;
  const mapVisible = showsMap(sport, title);
  const paceLabel = sport === "running" ? "Allure" : "Vitesse moyenne";
  const paceUnit = sport === "running" ? "min/km" : "km/h";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Link>

        <p className="mt-8 text-sm text-zinc-400">{SPORT_LABEL[sport]}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{title}</h1>

        {mapVisible ? (
          <div className="mt-8 mb-6 flex h-64 w-full items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800">
            <Map className="size-8 text-zinc-600" aria-hidden />
            <span className="sr-only">Carte du parcours</span>
          </div>
        ) : null}

        <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 ${mapVisible ? "" : "mt-8"}`}>
          <StatTile icon={Route} label="Distance" value="—" unit="km" />
          <StatTile icon={Gauge} label={paceLabel} value="—" unit={paceUnit} />
          <StatTile icon={Mountain} label="Ascension" value="—" unit="m" />
          <StatTile
            icon={Heart}
            label="BPM moyen"
            value="—"
            iconClassName="text-rose-400"
          />
          {averageWatts !== null ? (
            <StatTile
              icon={Zap}
              label="Watts moyens"
              value={String(averageWatts)}
              unit="W"
              iconClassName="text-amber-400"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  iconClassName = "text-emerald-500",
}: {
  icon: typeof Route;
  label: string;
  value: string;
  unit?: string;
  iconClassName?: string;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-400">{label}</p>
        <Icon className={`size-4 ${iconClassName}`} aria-hidden />
      </div>
      <p className="mt-4 text-2xl font-medium text-white tabular-nums">
        {value}
        {unit ? <span className="ml-1.5 text-sm font-normal text-zinc-500">{unit}</span> : null}
      </p>
    </article>
  );
}
