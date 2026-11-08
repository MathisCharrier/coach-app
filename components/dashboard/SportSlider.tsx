"use client";

import { Bike, Dumbbell, Footprints, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { cn } from "cn";

import type { GarminActivitySummary } from "@/lib/garmin/types";
import { useAthleteStore } from "@/store/useAthleteStore";
import { useGarminStore } from "@/store/useGarminStore";

import { sportFromTitle, type SportKind } from "./sport-kind";

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
  return activities
    .filter((activity) => sportFromTitle(activity.title, "cycling") === sport)
    .slice(0, 3);
}

export function SportSlider() {
  const activities = useGarminStore((state) => state.activities);
  const sessionExpired = useGarminStore((state) => state.sessionExpired);
  const isSyncing = useGarminStore((state) => state.isSyncing);
  const ftpWatts = useAthleteStore((state) => state.ftpWatts);
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
      <h2 className="mb-4 text-sm text-zinc-400">Statut d&apos;entraînement</h2>

      <div
        ref={scrollerRef}
        onScroll={syncActiveSport}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-hide"
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
              ? formStatus(powers, ftpWatts)
              : { label: "À calibrer", percent: 12 };

          return (
            <article
              key={slide.id}
              ref={(node) => {
                slideRefs.current[index] = node;
              }}
              className="w-full shrink-0 snap-center rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:w-[90%]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-emerald-500" aria-hidden />
                  <h3 className="text-sm text-zinc-200">{slide.label}</h3>
                </div>
                <p className="text-sm text-zinc-400">{form.label}</p>
              </div>

              <div
                className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800"
                role="meter"
                aria-valuenow={form.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Forme ${slide.label}`}
              >
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${form.percent}%` }}
                />
              </div>

              {slide.id === "cycling" && sessionExpired && !isSyncing ? (
                <Link
                  href="/profile"
                  className="mt-4 inline-flex text-xs text-amber-300/90 underline-offset-2 hover:underline"
                >
                  Session Garmin expirée, reconnectez-vous dans le Profil
                </Link>
              ) : null}

              <ul className="mt-5 space-y-2">
                {recent.length === 0 ? (
                  <li className="rounded-2xl bg-zinc-950 px-3 py-3 text-sm text-zinc-500">
                    Aucune séance récente.
                  </li>
                ) : (
                  recent.map((activity) => (
                    <li
                      key={activity.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-950 px-3 py-3"
                    >
                      <span className="truncate text-sm text-zinc-100">
                        {activity.title}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
                        {activity.durationLabel}
                        {activity.averagePowerWatts !== null
                          ? ` · ${activity.averagePowerWatts} W`
                          : ""}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </article>
          );
        })}
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
                selected ? "bg-white" : "bg-zinc-600"
              )}
            />
          );
        })}
      </div>
    </section>
  );
}
