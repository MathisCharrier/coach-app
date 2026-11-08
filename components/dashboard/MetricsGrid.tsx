"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bike,
  Footprints,
  HeartPulse,
  History,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { useAthleteStore } from "@/store/useAthleteStore";
import { useGarminStore } from "@/store/useGarminStore";
import { cn } from "cn";

type MetricId = "ftp" | "vo2" | "intensity" | "load" | "steps" | "last";

const OPTIONS: { id: MetricId; label: string }[] = [
  { id: "ftp", label: "FTP" },
  { id: "vo2", label: "VO2 Max" },
  { id: "intensity", label: "Intensité de la progression" },
  { id: "load", label: "Charge d'entraînement" },
  { id: "steps", label: "Nombre de pas" },
  { id: "last", label: "Dernière activité" },
];

const ICONS: Record<MetricId, LucideIcon> = {
  ftp: Bike,
  vo2: HeartPulse,
  intensity: Activity,
  load: Zap,
  steps: Footprints,
  last: History,
};

export function MetricsGrid() {
  const ftpWatts = useAthleteStore((state) => state.ftpWatts);
  const vo2Max = useAthleteStore((state) => state.vo2Max);
  const activities = useGarminStore((state) => state.activities);
  const [selected, setSelected] = useState<MetricId[]>([
    "ftp",
    "vo2",
    "load",
    "last",
  ]);
  const [open, setOpen] = useState(false);

  const latest = activities[0] ?? null;
  const load = activities.reduce((sum, activity) => sum + (activity.tss ?? 0), 0);
  const hasTss = activities.some((activity) => activity.tss !== null);
  const intensity =
    latest?.averagePowerWatts && ftpWatts > 0
      ? Math.round((latest.averagePowerWatts / ftpWatts) * 100)
      : null;

  const values: Record<MetricId, { value: string; unit?: string }> = {
    ftp: { value: String(ftpWatts), unit: "W" },
    vo2: { value: String(vo2Max), unit: "ml/kg/min" },
    intensity: {
      value: intensity === null ? "—" : String(intensity),
      unit: intensity === null ? undefined : "%",
    },
    load: {
      value: hasTss ? String(load) : "—",
      unit: hasTss ? "TSS" : undefined,
    },
    steps: { value: "—" },
    last: {
      value: latest?.title ?? "—",
      unit: latest
        ? new Date(latest.date).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          })
        : undefined,
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
        <h2 className="text-sm text-zinc-400">Aperçu des performances</h2>
        <div className="relative">
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300"
          >
            <SlidersHorizontal className="size-4 text-emerald-500" aria-hidden />
            Personnaliser
          </button>
          {open ? (
            <div
              role="dialog"
              aria-label="Métriques affichées"
              className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950 p-3"
            >
              <ul className="space-y-1">
                {OPTIONS.map((option) => {
                  const checked = selected.includes(option.id);
                  return (
                    <li key={option.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(option.id)}
                          className="size-4 accent-emerald-500"
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
        <p className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">
          Aucune métrique sélectionnée.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {visible.map((option) => {
            const Icon = ICONS[option.id];
            const metric = values[option.id];
            const compact = option.id === "last";

            return (
              <article
                key={option.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-zinc-400">{option.label}</p>
                  <Icon className="size-4 shrink-0 text-emerald-500" aria-hidden />
                </div>
                <p
                  className={cn(
                    "mt-6 font-medium tracking-tight text-white",
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
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
