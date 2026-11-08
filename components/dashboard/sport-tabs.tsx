"use client";

import { Activity, Bike, CalendarDays, Dumbbell, Footprints } from "lucide-react";

import { cn } from "cn";

import type { SportView } from "@/components/dashboard/stats-tiles";

const TABS: { id: SportView; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: Activity },
  { id: "cycling", label: "Cyclisme", icon: Bike },
  { id: "running", label: "Course à pied", icon: Footprints },
  { id: "strength", label: "Force", icon: Dumbbell },
  { id: "calendar", label: "Calendrier", icon: CalendarDays },
];

export function SportTabs({
  value,
  onChange,
}: {
  value: SportView;
  onChange: (view: SportView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Sports"
      className="flex gap-1 overflow-x-auto rounded-full border border-zinc-800 bg-zinc-900 p-1"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const selected = value === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm text-zinc-400 transition-colors",
              selected && "bg-zinc-950 text-zinc-50"
            )}
          >
            <Icon
              className={cn("size-4", selected && "text-emerald-500")}
              aria-hidden
            />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export type { SportView };
