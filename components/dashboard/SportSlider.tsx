"use client";

import { Bike, ChevronLeft, ChevronRight, Dumbbell, Footprints, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { cn } from "cn";

import type { GarminActivitySummary } from "@/lib/garmin/types";
import { useAthleteStore } from "@/store/useAthleteStore";
import { useGarminStore } from "@/store/useGarminStore";

import {
  activityTitle,
  formatDistanceOrDuration,
  formatRelativeDay,
  useTodayKey,
} from "./activity-display";
import { sportFromGarmin, type SportKind } from "./sport-kind";

const SLIDES: { id: Exclude<SportKind, "other">; label: string; icon: LucideIcon }[] = [
  { id: "cycling", label: "Cyclisme", icon: Bike },
  { id: "running", label: "Trail / Course à pied", icon: Footprints },
  { id: "strength", label: "Musculation", icon: Dumbbell },
];

function formStatus(powers: number[], ftp: number): { label: string; percent: number } {
  if (powers.length === 0 || ftp <= 0) {
    return { label: "À calibrer", percent: 12 };
  }

  const average = powers.reduce((sum, value) => sum + value, 0) / powers.length;
  const ratio = average / ftp;
  const percent = Math.max(12, Math.min(100, Math.round(ratio * 100)));

  if (ratio >= 0.8) {
    return { label: "En forme", percent };
  }

  if (ratio >= 0.65) {
    return { label: "Stable", percent };
  }

  return { label: "Fatigué", percent };
}

function recentForSport(
  activities: GarminActivitySummary[],
  sport: Exclude<SportKind, "other">
): GarminActivitySummary[] {
  return activities.filter((activity) => sportFromGarmin(activity) === sport).slice(0, 3);
}

export function SportSlider() {
  const activities = useGarminStore((state) => state.activities);
  const sessionExpired = useGarminStore((state) => state.sessionExpired);
  const isSyncing = useGarminStore((state) => state.isSyncing);
  const ftp = useAthleteStore((state) => state.ftp);
  const todayKey = useTodayKey();
  const [activeSportIndex, setActiveSportIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);

  function syncActiveSport() {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const midpoint = scroller.scrollLeft + scroller.clientWidth / 2;
    let closest = 0;
    let best = Number.POSITIVE_INFINITY;

    slideRefs.current.forEach((card, index) => {
      if (!card) {
        return;
      }

      const center = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(center - midpoint);
      if (distance < best) {
        best = distance;
        closest = index;
      }
    });

    setActiveSportIndex((current) => (current === closest ? current : closest));
  }

  function scrollToSport(index: number) {
    if (index < 0 || index >= SLIDES.length) {
      return;
    }

    setActiveSportIndex(index);
    const scroller = scrollerRef.current;
    const card = slideRefs.current[index];
    if (!scroller || !card) {
      return;
    }

    const left = card.offsetLeft - (scroller.clientWidth - card.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }

  return (
    <section>
      <h2 className="mb-4 text-sm text-zinc-500">Statut d&apos;entraînement</h2>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Sport précédent"
          onClick={() => scrollToSport(activeSportIndex - 1)}
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-zinc-500 shadow-sm hover:text-orange-600",
            activeSportIndex === 0 && "invisible"
          )}
          tabIndex={activeSportIndex === 0 ? -1 : 0}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>

      <div
        ref={scrollerRef}
        onScroll={syncActiveSport}
        className="flex min-w-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-hide"
      >
        {SLIDES.map((slide, index) => {
          const Icon = slide.icon;
          const recent = recentForSport(activities, slide.id);
          const powers =
            slide.id === "cycling"
              ? recent
                  .map((activity) => activity.averagePowerWatts)
                  .filter((value): value is number => value !== null)
              : [];
          const form =
            slide.id === "cycling"
              ? formStatus(powers, ftp)
              : { label: "À calibrer", percent: 12 };

          return (
            <article
              key={slide.id}
              ref={(node) => {
                slideRefs.current[index] = node;
              }}
              className="w-full shrink-0 snap-center rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:w-[90%]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-orange-500" aria-hidden />
                  <h3 className="text-sm font-medium text-zinc-900">{slide.label}</h3>
                </div>
                <p className="text-sm text-zinc-500">{form.label}</p>
              </div>

              <div
                className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100"
                role="meter"
                aria-valuenow={form.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Forme ${slide.label}`}
              >
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${form.percent}%` }}
                />
              </div>

              {slide.id === "cycling" && sessionExpired && !isSyncing ? (
                <Link
                  href="/profile"
                  className="mt-4 inline-flex text-xs text-orange-700 underline-offset-2 hover:underline"
                >
                  Session Garmin expirée, reconnectez-vous dans le Profil
                </Link>
              ) : null}

              <ul className="mt-5 space-y-2">
                {recent.length === 0 ? (
                  <li className="rounded-2xl bg-gray-50 px-3 py-3 text-sm text-zinc-500">
                    Aucune activité récente
                  </li>
                ) : (
                  recent.map((activity) => (
                    <li
                      key={activity.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-3 py-3"
                    >
                      <span className="truncate text-sm text-zinc-900">
                        {activityTitle(activity)}
                      </span>
                      <span className="shrink-0 text-right text-xs text-zinc-500 tabular-nums">
                        {formatRelativeDay(activity.date, todayKey)}
                        {" · "}
                        {formatDistanceOrDuration(activity)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </article>
          );
        })}
      </div>

        <button
          type="button"
          aria-label="Sport suivant"
          onClick={() => scrollToSport(activeSportIndex + 1)}
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-zinc-500 shadow-sm hover:text-orange-600",
            activeSportIndex === SLIDES.length - 1 && "invisible"
          )}
          tabIndex={activeSportIndex === SLIDES.length - 1 ? -1 : 0}
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {SLIDES.map((item, index) => {
          const selected = index === activeSportIndex;

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={selected ? "true" : undefined}
              onClick={() => scrollToSport(index)}
              className={cn(
                "size-2 rounded-full",
                selected ? "bg-orange-600" : "bg-gray-300"
              )}
            />
          );
        })}
      </div>
    </section>
  );
}
