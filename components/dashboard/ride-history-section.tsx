"use client";

import { Calendar, Gauge, History, Loader2, Timer } from "lucide-react";
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
import { useGarminStore } from "@/store/useGarminStore";

function RideHistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-border/40 bg-muted/20 p-4"
        >
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="mt-3 flex gap-2">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RideHistorySection() {
  const activities = useGarminStore((s) => s.activities);
  const lastSyncedAt = useGarminStore((s) => s.lastSyncedAt);
  const sessionExpired = useGarminStore((s) => s.sessionExpired);
  const isSyncing = useGarminStore((s) => s.isSyncing);

  const hasData = activities.length > 0;

  return (
    <Card className="rounded-3xl border border-zinc-800 bg-zinc-900 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" aria-hidden />
          <CardTitle className="text-lg font-semibold">
            Historique des sorties
          </CardTitle>
        </div>
        <CardDescription>
          Dernières activités cyclistes importées depuis Garmin Connect.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessionExpired && !isSyncing ? (
          <Link
            href="/profile"
            className="inline-flex text-xs text-amber-300/90 underline-offset-2 hover:underline"
          >
            Session Garmin expirée, reconnectez-vous dans le Profil
          </Link>
        ) : null}

        {isSyncing ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Synchronisation Garmin…
          </p>
        ) : null}

        {!hasData && !isSyncing ? (
          <>
            <RideHistorySkeleton />
            <p className="text-sm text-muted-foreground">
              Aucune sortie synchronisée pour le moment.
            </p>
            {!sessionExpired ? (
              <Link
                href="/profile"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                Connecter Garmin dans le profil
              </Link>
            ) : null}
          </>
        ) : hasData ? (
          <>
            {lastSyncedAt ? (
              <p className="text-xs text-muted-foreground">
                Mis à jour le{" "}
                {new Date(lastSyncedAt).toLocaleString("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            ) : null}
            <ul className="space-y-3">
              {activities.slice(0, 6).map((activity) => (
                <li key={activity.id}>
                  <article className="rounded-xl border border-border/50 bg-background/50 p-4">
                    <h3 className="font-medium text-foreground">
                      {activity.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3.5" aria-hidden />
                        {new Date(activity.date).toLocaleDateString("fr-FR")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Timer className="size-3.5" aria-hidden />
                        {activity.durationLabel}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Gauge className="size-3.5" aria-hidden />
                        {activity.averagePowerWatts ?? "—"} W
                      </span>
                      <span>TSS {activity.tss ?? "—"}</span>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
