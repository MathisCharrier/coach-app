"use client";

import { ArrowLeft, Gauge, Heart, Map, Mountain, Route, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { sportFromTitle, type SportKind } from "@/components/dashboard/sport-kind";
import type { GarminActivitySummary, RoutePoint } from "@/lib/garmin/types";
import { useGarminStore } from "@/store/useGarminStore";
import { useWorkoutPlanStore } from "@/store/useWorkoutPlanStore";

const MapRoute = dynamic(
  () => import("@/components/MapRoute").then((mod) => mod.MapRoute),
  {
    ssr: false,
    loading: () => (
      <div className="mt-8 mb-6 h-64 animate-pulse rounded-2xl border border-gray-200 bg-white shadow-sm" />
    ),
  }
);

const SPORT_LABEL: Record<SportKind, string> = {
  cycling: "Cyclisme",
  running: "Course à pied",
  strength: "Musculation",
  other: "Séance",
};

function isOutdoorRun(title: string): boolean {
  return !/tapis|indoor|home|salle/.test(title.toLowerCase());
}

function showsMap(sport: SportKind, activityType: string, title: string): boolean {
  if (sport === "cycling") {
    return true;
  }

  if (sport !== "running") {
    return false;
  }

  if (/treadmill|indoor|virtual/.test(activityType)) {
    return false;
  }

  return isOutdoorRun(title);
}

function sportFromActivity(activity: GarminActivitySummary): SportKind {
  const typeKey = activity.activityType?.toLowerCase() ?? "";

  if (/run|trail|treadmill|walk|hike/.test(typeKey)) {
    return "running";
  }

  if (/cycl|bik|ride/.test(typeKey)) {
    return "cycling";
  }

  if (/strength|fitness|gym/.test(typeKey)) {
    return "strength";
  }

  return sportFromTitle(activity.activityName ?? activity.title, "other");
}

function formatMeasure(value: number | null | undefined, digits: number): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatDistanceKm(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) {
    return "—";
  }

  return formatMeasure(meters / 1000, 2);
}

function formatSpeed(activity: GarminActivitySummary, sport: SportKind): string {
  const metersPerSecond = activity.averageSpeed;
  if (
    metersPerSecond === null ||
    metersPerSecond === undefined ||
    !Number.isFinite(metersPerSecond) ||
    metersPerSecond <= 0
  ) {
    return "—";
  }

  if (sport === "running") {
    const secondsPerKm = 1000 / metersPerSecond;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return formatMeasure(metersPerSecond * 3.6, 1);
}

function parseCoordinates(value: unknown): RoutePoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((point) => {
    if (!Array.isArray(point) || point.length < 2) {
      return [];
    }

    const lat = Number(point[0]);
    const lng = Number(point[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return [];
    }

    return [[lat, lng] as RoutePoint];
  });
}

export function ActivityDetail() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const activities = useGarminStore((state) => state.activities);
  const upcoming = useWorkoutPlanStore((state) => state.upcoming);
  const route = useGarminStore((state) => (id ? state.routes[id] : undefined));
  const setRoute = useGarminStore((state) => state.setRoute);
  const [routeSettled, setRouteSettled] = useState(false);

  const garmin = activities.find((activity) => String(activity.id) === id);
  const planned = upcoming.find((workout) => workout.id === id);
  const title = garmin?.activityName ?? garmin?.title ?? planned?.title ?? "Séance";
  const activityType = garmin?.activityType ?? "";
  const sport = garmin
    ? sportFromActivity(garmin)
    : sportFromTitle(planned?.title ?? "", "cycling");
  const mapVisible = garmin ? showsMap(sport, activityType, title) : false;

  useEffect(() => {
    if (!id || !mapVisible || (route && route.length >= 2)) {
      return;
    }

    if (garmin?.hasPolyline === false) {
      setRouteSettled(true);
      return;
    }

    const controller = new AbortController();
    setRouteSettled(false);

    fetch(`/api/garmin/activity/${id}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as {
          coordinates?: unknown;
          connected?: boolean;
        };
        if (data.connected === false) {
          setRouteSettled(true);
          return;
        }
        const coordinates = parseCoordinates(data.coordinates);
        if (coordinates.length >= 2) {
          setRoute(id, coordinates);
        }
        setRouteSettled(true);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setRouteSettled(true);
      });

    return () => controller.abort();
  }, [garmin?.hasPolyline, id, mapVisible, route, setRoute]);

  if (!garmin && !planned) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-slate-50">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm"
          >
            <ArrowLeft className="size-4" />
            Retour
          </Link>
          <div className="mt-16 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              Activité introuvable
            </h1>
            <p className="mt-3 text-sm text-zinc-400">
              Cette séance n&apos;est pas dans l&apos;historique synchronisé.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const averagePower = garmin?.averagePower ?? garmin?.averagePowerWatts ?? null;
  const paceLabel = sport === "running" ? "Allure" : "Vitesse moyenne";
  const paceUnit = sport === "running" ? "min/km" : "km/h";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Link>

        <p className="mt-8 text-sm text-zinc-500">{SPORT_LABEL[sport]}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{title}</h1>

        {mapVisible ? (
          route && route.length >= 2 ? (
            <MapRoute positions={route} />
          ) : (
            <div className="mt-8 mb-6 flex h-64 w-full items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {routeSettled ? (
                <Map className="size-8 text-zinc-400" aria-hidden />
              ) : (
                <div className="h-full w-full animate-pulse bg-gray-100" />
              )}
              <span className="sr-only">
                {routeSettled ? "Tracé GPS indisponible" : "Chargement du tracé"}
              </span>
            </div>
          )
        ) : null}

        <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 ${mapVisible ? "" : "mt-8"}`}>
          <StatTile
            icon={Route}
            label="Distance"
            value={formatDistanceKm(garmin?.distance)}
            unit="km"
          />
          <StatTile
            icon={Gauge}
            label={paceLabel}
            value={garmin ? formatSpeed(garmin, sport) : "—"}
            unit={paceUnit}
          />
          <StatTile
            icon={Mountain}
            label="Ascension"
            value={formatMeasure(garmin?.elevationGain, 0)}
            unit="m"
          />
          <StatTile
            icon={Heart}
            label="BPM moyen"
            value={formatMeasure(garmin?.averageHR, 0)}
            iconClassName="text-orange-500"
          />
          {averagePower !== null && averagePower > 0 ? (
            <StatTile
              icon={Zap}
              label="Watts moyens"
              value={formatMeasure(averagePower, 0)}
              unit="W"
              iconClassName="text-orange-500"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  iconClassName = "text-orange-500",
}: {
  icon: typeof Route;
  label: string;
  value: string;
  unit?: string;
  iconClassName?: string;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-500">{label}</p>
        <Icon className={`size-4 ${iconClassName}`} aria-hidden />
      </div>
      <p className="mt-4 text-2xl font-medium text-zinc-900 tabular-nums">
        {value}
        {unit ? <span className="ml-1.5 text-sm font-normal text-zinc-500">{unit}</span> : null}
      </p>
    </article>
  );
}
