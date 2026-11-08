"use client";

import { BatteryFull, Play, Timer, Zap } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatDuration } from "@/lib/garmin/format";
import { useGarminStore } from "@/store/useGarminStore";
import { useWorkoutPlanStore } from "@/store/useWorkoutPlanStore";
import { cn } from "cn";

import {
  activityTitle,
  dayKey,
  formatDistanceOrDuration,
  formatRelativeDay,
  useTodayKey,
} from "./activity-display";
import { estimatedLoad, SPORT_META, sportFromTitle } from "./sport-kind";

export function DailyActivity() {
  const upcoming = useWorkoutPlanStore((state) => state.upcoming);
  const latest = useGarminStore((state) => state.activities[0] ?? null);
  const todayKey = useTodayKey();

  const session =
    upcoming.find((workout) => {
      const created = new Date(workout.createdAt);
      return !Number.isNaN(created.getTime()) && dayKey(created) === todayKey;
    }) ?? null;

  if (!todayKey) {
    return (
      <section className="h-64 animate-pulse rounded-3xl border border-gray-200 bg-white shadow-sm" />
    );
  }

  if (!session && latest) {
    return (
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm text-zinc-500">Dernière séance réalisée</p>
        <h2 className="mt-3 max-w-3xl text-4xl font-medium tracking-tight text-zinc-900 md:text-5xl">
          {activityTitle(latest)}
        </h2>
        <p className="mt-4 text-sm text-zinc-500">
          {formatRelativeDay(latest.date, todayKey)}
          {" · "}
          {formatDistanceOrDuration(latest)}
        </p>
        <Link
          href={`/activity/${latest.id}`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-8 h-11 rounded-full bg-orange-600 px-5 font-medium text-white shadow-sm hover:bg-orange-700"
          )}
        >
          Voir la séance
        </Link>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <BatteryFull className="size-8 text-orange-500" aria-hidden />
        <h2 className="mt-4 max-w-xl text-4xl font-medium tracking-tight text-zinc-900 md:text-5xl">
          Journée de récupération
        </h2>
        <p className="mt-4 max-w-md text-sm leading-6 text-zinc-500">
          Aucune séance prévue aujourd&apos;hui. Le corps consolide le travail déjà fait.
        </p>
      </section>
    );
  }

  const sport = SPORT_META[sportFromTitle(session.title, "cycling")];
  const SportIcon = sport.icon;
  const load = estimatedLoad(session.totalDurationSeconds, session.title);

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">Séance du jour</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-600">
          <SportIcon className="size-3.5" aria-hidden />
          {sport.label}
        </span>
      </div>

      <h2 className="mt-4 max-w-3xl text-4xl font-medium tracking-tight text-zinc-900 md:text-5xl">
        {session.title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
        {session.description}
      </p>

      <dl className="mt-8 flex flex-wrap gap-8">
        <div>
          <dt className="inline-flex items-center gap-1.5 text-sm text-zinc-500">
            <Timer className="size-4 text-orange-500" aria-hidden />
            Durée
          </dt>
          <dd className="mt-2 text-2xl text-zinc-900 tabular-nums">
            {formatDuration(session.totalDurationSeconds)}
          </dd>
        </div>
        <div>
          <dt className="inline-flex items-center gap-1.5 text-sm text-zinc-500">
            <Zap className="size-4 text-orange-500" aria-hidden />
            Charge
          </dt>
          <dd className="mt-2 text-2xl text-zinc-900 tabular-nums">{load}</dd>
        </div>
      </dl>

      <Link
        href="/ride"
        className={cn(
          buttonVariants({ size: "lg" }),
          "mt-8 h-11 rounded-full bg-orange-600 px-5 font-medium text-white shadow-sm hover:bg-orange-700"
        )}
      >
        <Play className="size-4" />
        Démarrer la séance
      </Link>
    </section>
  );
}
