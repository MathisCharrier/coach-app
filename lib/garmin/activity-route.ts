import type { IGarminTokens } from "garmin-connect/dist/garmin/types";

import type { RoutePoint } from "@/lib/garmin/types";

const DETAILS_URL = "https://connectapi.garmin.com/activity-service/activity";
const GPX_URL = "https://connectapi.garmin.com/download-service/export/gpx/activity";
const MAX_POINTS = 400;

type GarminHttp = {
  client: {
    get: (
      url: string,
      config?: { params?: Record<string, number> }
    ) => Promise<unknown>;
  };
  loadToken: (
    oauth1: IGarminTokens["oauth1"],
    oauth2: IGarminTokens["oauth2"]
  ) => void;
};

function isRoutePoint(value: unknown): value is RoutePoint {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 90 &&
    Math.abs(value[1]) <= 180
  );
}

function pointFromRecord(value: unknown): RoutePoint | null {
  if (Array.isArray(value) && value.length >= 2) {
    const lat = Number(value[0]);
    const lng = Number(value[1]);
    return isRoutePoint([lat, lng]) ? [lat, lng] : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const lat = Number(record.lat ?? record.latitude);
  const lng = Number(record.lon ?? record.lng ?? record.longitude);
  return isRoutePoint([lat, lng]) ? [lat, lng] : null;
}

function decodePolyline(encoded: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index <= encoded.length);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index <= encoded.length);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    const point: RoutePoint = [lat / 1e5, lng / 1e5];
    if (isRoutePoint(point)) {
      points.push(point);
    }
  }

  return points;
}

function pointsFromUnknown(value: unknown): RoutePoint[] {
  if (typeof value === "string" && value.length > 0) {
    return decodePolyline(value);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const point = pointFromRecord(item);
    return point ? [point] : [];
  });
}

function readDetailsPolyline(payload: unknown): RoutePoint[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const geoSource = record.geoPolylineDTO ?? record.geoPolyline;
  const geo =
    geoSource && typeof geoSource === "object"
      ? (geoSource as Record<string, unknown>)
      : null;

  const direct = pointsFromUnknown(geo?.polyline ?? record.polyline);
  if (direct.length >= 2) {
    return direct;
  }

  return [];
}

function readGpx(payload: unknown): RoutePoint[] {
  const xml = typeof payload === "string" ? payload : "";
  if (!xml.includes("<trkpt")) {
    return [];
  }

  const points: RoutePoint[] = [];
  for (const match of xml.matchAll(/<trkpt\b([^>]*)>/g)) {
    const attrs = match[1] ?? "";
    const lat = Number(/lat="([^"]+)"/.exec(attrs)?.[1]);
    const lng = Number(/lon="([^"]+)"/.exec(attrs)?.[1]);
    if (isRoutePoint([lat, lng])) {
      points.push([lat, lng]);
    }
  }

  return points;
}

function downsample(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= MAX_POINTS) {
    return points;
  }

  const step = Math.ceil(points.length / MAX_POINTS);
  const sampled = points.filter((_, index) => index % step === 0);
  const last = points[points.length - 1];
  if (last && sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }

  return sampled;
}

export async function fetchGarminRoute(
  tokens: IGarminTokens,
  activityId: number
): Promise<RoutePoint[]> {
  const { GarminConnect } = await import("garmin-connect");
  const client = new GarminConnect({
    username: "session",
    password: "session",
  }) as unknown as GarminHttp;
  client.loadToken(tokens.oauth1, tokens.oauth2);

  try {
    const details = await client.client.get(
      `${DETAILS_URL}/${activityId}/details`,
      { params: { maxChartSize: 2000, maxPolylineSize: 400 } }
    );
    const fromDetails = readDetailsPolyline(details);
    if (fromDetails.length >= 2) {
      return downsample(fromDetails);
    }
  } catch (error) {
    if (isAuthError(error)) {
      throw error;
    }
  }

  try {
    const gpx = await client.client.get(`${GPX_URL}/${activityId}`);
    return downsample(readGpx(toText(gpx)));
  } catch (error) {
    if (isAuthError(error)) {
      throw error;
    }
    return [];
  }
}

function isAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("token") ||
    message.includes("expired")
  );
}

function toText(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }
  if (payload instanceof ArrayBuffer) {
    return new TextDecoder().decode(payload);
  }
  if (ArrayBuffer.isView(payload)) {
    return new TextDecoder().decode(payload);
  }
  return "";
}
