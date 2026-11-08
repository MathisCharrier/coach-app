"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bike,
  Footprints,
  Gauge,
  Heart,
  HeartPulse,
  History,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";

import { formatDuration } from "@/lib/garmin/format";
import type { GarminActivitySummary } from "@/lib/garmin/types";
import { useAthleteStore } from "@/store/useAthleteStore";
import { useGarminStore } from "@/store/useGarminStore";
import { cn } from "cn";

import {
  activityTitle,
  dayKey,
  formatRelativeDay,
  shiftDayKey,
  useTodayKey,
} from "./activity-display";
import { sportFromGarmin, type SportKind } from "./sport-kind";

const MetricSparkline = dynamic(
  () => import("./metric-sparkline").then((mod) => mod.MetricSparkline),
  {
    ssr: false,
    loading: () => <div className="mt-4 h-12 w-full animate-pulse rounded-full bg-gray-100" />,
  }
);

type MetricId = "ftp" | "vo2" | "intensity" | "load" | "watts" | "bpm" | "steps" | "last";

const OPTIONS: { id: MetricId; label: string }[] = [
  { id: "ftp", label: "FTP" },
  { id: "vo2", label: "VO2 Max" },
  { id: "intensity", label: "Intensité de la progression" },
  { id: "load", label: "Charge d'entraînement" },
  { id: "watts", label: "Watts" },
  { id: "bpm", label: "BPM moyen" },
  { id: "steps", label: "Nombre de pas" },
  { id: "last", label: "Dernière activité" },
];

const ICONS: Record<MetricId, LucideIcon> = {
  ftp: Bike,
  vo2: HeartPulse,
  intensity: Activity,
  load: Zap,
  watts: Gauge,
  bpm: Heart,
  steps: Footprints,
  last: History,
};

function recentSeries(
  activities: GarminActivitySummary[],
  pick: (activity: GarminActivitySummary) => number | null | undefined,
  sport?: SportKind
): number[] {
  const values: number[] = [];

  for (const activity of activities) {
    if (sport && sportFromGarmin(activity) !== sport) {
      continue;
    }

    const value = pick(activity);
    if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
      continue;
    }

    values.push(value);
    if (values.length === 20) {
      break;
    }
  }

  return values.reverse();
}

function MetricGauge({ percent }: { percent: number | null }) {
  if (percent === null) {
    return <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-gray-100" />;
  }

  return (
    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className="h-full rounded-full bg-orange-500"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

export function MetricsGrid() {
  const ftp = useAthleteStore((state) => state.ftp);
  const vo2max = useAthleteStore((state) => state.vo2max);
  const activities = useGarminStore((state) => state.activities);
  const todayKey = useTodayKey();
  const [selected, setSelected] = useState<MetricId[]>([
    "ftp",
    "vo2",
    "load",
    "watts",
    "bpm",
    "last",
  ]);
  const [open, setOpen] = useState(false);

  const latest = activities[0] ?? null;
  const weekStart = todayKey ? shiftDayKey(todayKey, -6) : null;
  const recentWeek = weekStart
    ? activities.filter((activity) => {
        const date = new Date(activity.date);
        if (Number.isNaN(date.getTime()) || !todayKey) {
          return false;
        }
        const key = dayKey(date);
        return key >= weekStart && key <= todayKey;
      })
    : [];
  const weekDuration = recentWeek.reduce(
    (sum, activity) => sum + activity.durationSeconds,
    0
  );
  const weekDistance = recentWeek.reduce(
    (sum, activity) => sum + (activity.distance ?? 0),
    0
  );
  const weekSteps = recentWeek.reduce((sum, activity) => sum + (activity.steps ?? 0), 0);
  const latestPower = latest?.averagePower ?? latest?.averagePowerWatts ?? null;
  const intensity =
    latestPower !== null && latestPower > 0 && ftp > 0
      ? Math.round((latestPower / ftp) * 100)
      : null;
  const wattsSeries = recentSeries(
    activities,
    (activity) => activity.averagePower ?? activity.averagePowerWatts,
    "cycling"
  );
  const bpmSeries = recentSeries(activities, (activity) => activity.averageHR);
  const loadSeries = recentSeries(activities, (activity) =>
    activity.durationSeconds > 0 ? activity.durationSeconds / 60 : null
  );
  const latestWatts = wattsSeries.at(-1) ?? null;
  const latestBpm = bpmSeries.at(-1) ?? null;
  const ftpPercent = ftp > 0 ? Math.round((ftp / 400) * 100) : null;
  const vo2Percent = vo2max > 0 ? Math.round((vo2max / 80) * 100) : null;
  const load =
    weekDuration > 0
      ? { value: formatDuration(weekDuration), unit: "7 j" }
      : weekDistance > 0
        ? {
            value: (weekDistance / 1000).toLocaleString("fr-FR", {
              maximumFractionDigits: 1,
            }),
            unit: "km",
          }
        : { value: "—", unit: undefined };

  const values: Record<MetricId, { value: string; unit?: string }> = {
    ftp: { value: String(ftp), unit: "W" },
    vo2: { value: String(vo2max), unit: "ml/kg/min" },
    intensity: {
      value: intensity === null ? "—" : String(intensity),
      unit: intensity === null ? undefined : "%",
    },
    load,
    watts: {
      value: latestWatts === null ? "—" : String(Math.round(latestWatts)),
      unit: latestWatts === null ? undefined : "W",
    },
    bpm: {
      value: latestBpm === null ? "—" : String(Math.round(latestBpm)),
    },
    steps: {
      value: weekSteps > 0 ? weekSteps.toLocaleString("fr-FR") : "—",
    },
    last: {
      value: latest ? activityTitle(latest) : "—",
      unit: latest ? formatRelativeDay(latest.date, todayKey) : undefined,
    },
  };

  function toggle(id: MetricId) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  const visible = OPTIONS.filter((option) => selected.includes(option.id));

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm text-zinc-500">Aperçu des performances</h2>
        <div className="relative">
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm"
          >
            <SlidersHorizontal className="size-4 text-orange-500" aria-hidden />
            Personnaliser
          </button>
          {open ? (
            <div
              role="dialog"
              aria-label="Métriques affichées"
              className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
            >
              <ul className="space-y-1">
                {OPTIONS.map((option) => {
                  const checked = selected.includes(option.id);
                  return (
                    <li key={option.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm text-zinc-700 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(option.id)}
                          className="size-4 accent-orange-600"
                        />
                        {option.label}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
          Aucune métrique sélectionnée.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {visible.map((option) => {
            const Icon = ICONS[option.id];
            const metric = values[option.id];
            const compact = option.id === "last";
            const className = cn(
              "block rounded-3xl border border-gray-200 bg-white p-6 shadow-sm",
              compact &&
                latest &&
                "cursor-pointer transition-colors hover:bg-orange-50 hover:ring-1 hover:ring-orange-500"
            );
            const body = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-zinc-500">{option.label}</p>
                  <Icon className="size-4 shrink-0 text-orange-500" aria-hidden />
                </div>
                <p
                  className={cn(
                    "mt-6 font-medium tracking-tight text-zinc-900",
                    compact ? "line-clamp-2 text-xl" : "text-4xl tabular-nums"
                  )}
                >
                  {metric.value}
                  {metric.unit ? (
                    <span className="ml-2 text-base font-normal text-zinc-500">
                      {metric.unit}
                    </span>
                  ) : null}
                </p>
                {option.id === "ftp" ? <MetricGauge percent={ftpPercent} /> : null}
                {option.id === "vo2" ? <MetricGauge percent={vo2Percent} /> : null}
                {option.id === "load" ? <MetricSparkline values={loadSeries} /> : null}
                {option.id === "watts" ? <MetricSparkline values={wattsSeries} /> : null}
                {option.id === "bpm" ? <MetricSparkline values={bpmSeries} /> : null}
                {option.id === "steps" && weekSteps <= 0 ? (
                  <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-gray-100" />
                ) : null}
              </>
            );

            if (compact && activities[0]) {
              return (
                <Link
                  key={option.id}
                  href={`/activity/${activities[0].id}`}
                  className={className}
                >
                  {body}
                </Link>
              );
            }

            return (
              <article key={option.id} className={className}>
                {body}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
