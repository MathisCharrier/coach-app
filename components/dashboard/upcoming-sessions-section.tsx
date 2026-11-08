"use client";

import { CalendarClock, Sparkles, Timer } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration } from "@/lib/garmin/format";
import { useWorkoutPlanStore } from "@/store/useWorkoutPlanStore";

export function UpcomingSessionsSection() {
  const upcoming = useWorkoutPlanStore((s) => s.upcoming);

  return (
    <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" aria-hidden />
          <CardTitle className="text-lg font-semibold">Prochaines séances</CardTitle>
        </div>
        <CardDescription>
          Entraînements générés par l&apos;algorithme, prêts à être réalisés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-6 text-center">
            <Sparkles className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Aucune séance planifiée. Génère un entraînement depuis l&apos;espace
              indoor.
            </p>
            <Link
              href="/ride"
              className={cn(
                buttonVariants({ size: "sm" }),
                "mt-4 inline-flex"
              )}
            >
              Générer une séance
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((workout) => (
              <li key={workout.id}>
                <article className="rounded-xl border border-border/50 bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-foreground">
                        {workout.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {workout.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
                      Planifiée
                    </span>
                  </div>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Timer className="size-3.5" aria-hidden />
                    {formatDuration(workout.totalDurationSeconds)} ·{" "}
                    {workout.intervalCount} intervalles
                  </p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
