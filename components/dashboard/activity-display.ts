"use client";

import { useEffect, useState } from "react";

import type { GarminActivitySummary } from "@/lib/garmin/types";

export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useTodayKey(): string | null {
  const [todayKey, setTodayKey] = useState<string | null>(null);

  useEffect(() => {
    setTodayKey(dayKey(new Date()));
  }, []);

  return todayKey;
}

function previousDayKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() - 1);
  return dayKey(date);
}

export function formatRelativeDay(iso: string, todayKey: string | null): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const key = dayKey(date);
  if (todayKey && key === todayKey) {
    return "Aujourd'hui";
  }

  if (todayKey && key === previousDayKey(todayKey)) {
    return "Hier";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function shiftDayKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

export function activityTitle(activity: GarminActivitySummary): string {
  return activity.activityName?.trim() || activity.title;
}

export function formatDistanceOrDuration(activity: GarminActivitySummary): string {
  const meters = activity.distance;
  if (meters !== null && meters !== undefined && Number.isFinite(meters) && meters > 0) {
    const kilometers = meters / 1000;
    return `${kilometers.toLocaleString("fr-FR", {
      maximumFractionDigits: kilometers >= 10 ? 1 : 2,
    })} km`;
  }

  return activity.durationLabel;
}
