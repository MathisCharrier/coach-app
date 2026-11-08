"use client";

import { Play, Timer, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { formatDuration } from "@/lib/garmin/format";
import { useWorkoutPlanStore } from "@/store/useWorkoutPlanStore";
import { cn } from "cn";

import { estimatedLoad, SPORT_META, sportFromTitle } from "./sport-kind";

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DailyActivity() {
  const upcoming = useWorkoutPlanStore((state) => state.upcoming);
  const [todayKey, setTodayKey] = useState<string | null>(null);

  useEffect(() => {
    setTodayKey(dayKey(new Date()));
  }, []);

  const session =
    upcoming.find((workout) => {
      const created = new Date(workout.createdAt);
      return !Number.isNaN(created.getTime()) && dayKey(created) === todayKey;
    }) ?? null;

  if (!todayKey) {
    return (
      <section className="h-64 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900" />
    );
  }

  if (!session) {
    return (
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 md:p-8">
        <p className="text-sm text-zinc-400">Aujourd&apos;hui</p>
        <h2 className="mt-3 max-w-xl text-4xl font-medium tracking-tight text-white md:text-5xl">
          Aucune séance prévue
        </h2>
        <p className="mt-4 max-w-md text-sm leading-6 text-zinc-500">
          Génère un entraînement depuis l&apos;espace indoor pour l&apos;afficher ici.
        </p>
        <Link
          href="/ride"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-8 h-11 rounded-full bg-emerald-500 px-5 text-emerald-950 hover:bg-emerald-400"
          )}
        >
          <Play className="size-4" />
          Préparer une séance
        </Link>
      </section>
    );
  }

  const sport = SPORT_META[sportFromTitle(session.title, "cycling")];
  const SportIcon = sport.icon;
  const load = estimatedLoad(session.totalDurationSeconds, session.title);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">Séance du jour</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-400">
          <SportIcon className="size-3.5" aria-hidden />
          {sport.label}
        </span>
      </div>

      <h2 className="mt-4 max-w-3xl text-4xl font-medium tracking-tight text-white md:text-5xl">
        {session.title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
        {session.description}
      </p>

      <dl className="mt-8 flex flex-wrap gap-8">
        <div>
          <dt className="inline-flex items-center gap-1.5 text-sm text-zinc-400">
            <Timer className="size-4 text-emerald-500" aria-hidden />
            Durée
          </dt>
          <dd className="mt-2 text-2xl text-white tabular-nums">
            {formatDuration(session.totalDurationSeconds)}
          </dd>
        </div>
        <div>
          <dt className="inline-flex items-center gap-1.5 text-sm text-zinc-400">
            <Zap className="size-4 text-emerald-500" aria-hidden />
            Charge
          </dt>
          <dd className="mt-2 text-2xl text-white tabular-nums">{load}</dd>
        </div>
      </dl>

      <Link
        href="/ride"
        className={cn(
          buttonVariants({ size: "lg" }),
          "mt-8 h-11 rounded-full bg-emerald-500 px-5 text-emerald-950 hover:bg-emerald-400"
        )}
      >
        <Play className="size-4" />
        Démarrer la séance
      </Link>
    </section>
  );
}
