"use client";

import {
  Bike,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Footprints,
  HeartPulse,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useGarminStore } from "@/store/useGarminStore";
import { useWorkoutPlanStore } from "@/store/useWorkoutPlanStore";
import { formatDuration } from "@/lib/garmin/format";
import { cn } from "cn";

import { estimatedLoad } from "@/components/dashboard/sport-kind";

type SportKind = "cycling" | "running" | "strength" | "other";

type CalendarSession = {
  id: string;
  title: string;
  sport: SportKind;
  durationLabel: string;
  loadLabel: string;
  status: "Réalisée" | "Prévue";
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const SPORT_ICON = {
  cycling: Bike,
  running: Footprints,
  strength: Dumbbell,
  other: HeartPulse,
} as const;

function sportFromTitle(title: string, fallback: SportKind): SportKind {
  const value = title.toLowerCase();

  if (/muscu|force|strength|squat|halt[eé]ro/.test(value)) {
    return "strength";
  }

  if (/course|run|footing|trail|jogging/.test(value)) {
    return "running";
  }

  if (/v[eé]lo|cycl|bike|ftp|sweet|seuil|home trainer/.test(value)) {
    return "cycling";
  }

  return fallback;
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDayKey(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return dayKey(date);
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function CalendarView() {
  const activities = useGarminStore((state) => state.activities);
  const upcoming = useWorkoutPlanStore((state) => state.upcoming);
  const [cursor, setCursor] = useState<Date | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [mode, setMode] = useState<"month" | "week">("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setCursor(now);
    setToday(dayKey(now));
  }, []);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, CalendarSession[]>();

    const push = (key: string | null, session: CalendarSession) => {
      if (!key) {
        return;
      }

      const current = map.get(key) ?? [];
      current.push(session);
      map.set(key, current);
    };

    for (const activity of activities) {
      push(parseDayKey(activity.date), {
        id: String(activity.id),
        title: activity.title,
        sport: sportFromTitle(activity.title, "cycling"),
        durationLabel: activity.durationLabel,
        loadLabel: activity.tss === null ? "—" : String(activity.tss),
        status: "Réalisée",
      });
    }

    for (const workout of upcoming) {
      push(parseDayKey(workout.createdAt), {
        id: workout.id,
        title: workout.title,
        sport: sportFromTitle(workout.title, "cycling"),
        durationLabel: formatDuration(workout.totalDurationSeconds),
        loadLabel: String(estimatedLoad(workout.totalDurationSeconds, workout.title)),
        status: "Prévue",
      });
    }

    return map;
  }, [activities, upcoming]);

  const cells = useMemo(() => {
    if (!cursor) {
      return [];
    }

    if (mode === "week") {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
      });
    }

    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [cursor, mode]);

  if (!cursor) {
    return (
      <section className="h-80 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900" />
    );
  }

  const current = cursor;
  const todayKey = today;
  const label =
    mode === "week"
      ? `Semaine du ${cells[0]?.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
        })}`
      : current.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const selectedKey = selectedDate ? dayKey(selectedDate) : null;
  const selectedSessions = selectedKey ? (sessionsByDay.get(selectedKey) ?? []) : [];
  const selectedLabel = selectedDate
    ? capitalizeFirst(
        selectedDate.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      )
    : "";

  function shift(direction: -1 | 1) {
    const next = new Date(current);
    if (mode === "week") {
      next.setDate(next.getDate() + direction * 7);
    } else {
      next.setMonth(next.getMonth() + direction);
    }
    setCursor(next);
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm text-zinc-400">Calendrier</h2>
          <p className="mt-1 text-lg font-medium text-white">{capitalizeFirst(label)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-zinc-800 p-1">
            {(["month", "week"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs text-zinc-400",
                  mode === item && "bg-zinc-950 text-zinc-50"
                )}
              >
                {item === "month" ? "Mois" : "Semaine"}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Période précédente"
            onClick={() => shift(-1)}
            className="rounded-full border border-zinc-800 p-2 text-zinc-400"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Période suivante"
            onClick={() => shift(1)}
            className="rounded-full border border-zinc-800 p-2 text-zinc-400"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-1 pb-2 text-center text-xs text-zinc-500">
            {day}
          </div>
        ))}
        {cells.map((date) => {
          const key = dayKey(date);
          const inMonth = date.getMonth() === current.getMonth();
          const sessions = sessionsByDay.get(key) ?? [];
          const muted = mode === "month" && !inMonth;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(date)}
              aria-pressed={key === selectedKey}
              className={cn(
                "min-h-16 cursor-pointer rounded-2xl border border-zinc-800 p-2 text-left hover:bg-zinc-800 md:min-h-24",
                mode === "week" && "min-h-36",
                muted || sessions.length === 0 ? "bg-zinc-950/40" : "bg-zinc-800/70",
                key === todayKey && "ring-1 ring-emerald-500/40",
                key === selectedKey && "ring-1 ring-white"
              )}
            >
              <p
                className={cn(
                  "text-xs tabular-nums",
                  muted ? "text-zinc-700" : "text-zinc-400"
                )}
              >
                {date.getDate()}
              </p>
              {sessions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {sessions.slice(0, 3).map((session) => {
                    const Icon = SPORT_ICON[session.sport];
                    return (
                      <span
                        key={session.id}
                        title={session.title}
                        className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"
                      >
                        <Icon className="size-3.5" aria-hidden />
                        <span className="sr-only">{session.title}</span>
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedDate && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
              onClick={() => setSelectedDate(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={selectedLabel}
                className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-zinc-400">Récapitulatif</p>
                    <h3 className="mt-1 text-xl font-medium text-white">{selectedLabel}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300"
                  >
                    <X className="size-4" />
                    Fermer
                  </button>
                </div>

                {selectedSessions.length === 0 ? (
                  <p className="mt-5 text-sm text-zinc-500">Aucune séance ce jour.</p>
                ) : (
                  <ul className="mt-5 space-y-2">
                    {selectedSessions.map((session) => {
                      const Icon = SPORT_ICON[session.sport];
                      return (
                        <li key={session.id}>
                          <Link
                            href={`/activity/${session.id}`}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                                <Icon className="size-4" aria-hidden />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm text-zinc-50">{session.title}</p>
                                <p className="text-xs text-zinc-500">{session.status}</p>
                              </div>
                            </div>
                            <p className="shrink-0 text-right text-xs text-zinc-400 tabular-nums">
                              {session.durationLabel}
                              <span className="mt-1 block">Charge {session.loadLabel}</span>
                            </p>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <p className="mt-5 text-sm text-zinc-400">
                  Nombre de pas <span className="text-zinc-200 tabular-nums">—</span>
                </p>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
