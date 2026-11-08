import { Bike, Dumbbell, Footprints, HeartPulse, type LucideIcon } from "lucide-react";

export type SportKind = "cycling" | "running" | "strength" | "other";

export const SPORT_META: Record<
  SportKind,
  { label: string; icon: LucideIcon }
> = {
  cycling: { label: "Vélo", icon: Bike },
  running: { label: "Trail", icon: Footprints },
  strength: { label: "Musculation", icon: Dumbbell },
  other: { label: "Autre", icon: HeartPulse },
};

export function sportFromTitle(title: string, fallback: SportKind = "other"): SportKind {
  const value = title.toLowerCase();

  if (/muscu|force|strength|squat|halt[eé]ro/.test(value)) {
    return "strength";
  }

  if (/course|run|trail|footing|jogging/.test(value)) {
    return "running";
  }

  if (/v[eé]lo|cycl|bike|ftp|sweet|seuil|home trainer/.test(value)) {
    return "cycling";
  }

  return fallback;
}

export function estimatedLoad(durationSeconds: number, title: string): number {
  const hours = Math.max(0, durationSeconds) / 3600;
  const value = title.toLowerCase();
  const intensity = /seuil|threshold|vo2/.test(value)
    ? 0.95
    : /sweet/.test(value)
      ? 0.9
      : /r[eé]cup|endurance|longue/.test(value)
        ? 0.65
        : 0.75;

  return Math.max(1, Math.round(hours * intensity * intensity * 100));
}
