import type { IActivity } from "garmin-connect/dist/garmin/types/activity";
import { ActivityType } from "garmin-connect/dist/garmin/types/activity";
import type { IGarminTokens } from "garmin-connect/dist/garmin/types";

import { formatDuration, toNumber } from "@/lib/garmin/format";
import type { GarminActivitySummary } from "@/lib/garmin/types";
import type { GarminLiveClient } from "@/lib/garminClient";

/** Une seule page, assez longue pour les courbes, sous le budget serverless. */
export const GARMIN_HISTORY_LIMIT = 200;
const FETCH_BUDGET_MS = 8_000;

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function isCyclingActivity(activity: IActivity): boolean {
  const typeKey = activity.activityType?.typeKey?.toLowerCase() ?? "";
  return (
    typeKey.includes("cycling") ||
    typeKey.includes("ride") ||
    typeKey === "indoor_cycling"
  );
}

function mapActivity(activity: IActivity): GarminActivitySummary {
  const durationSeconds =
    toNumber(activity.movingDuration) ??
    toNumber(activity.elapsedDuration) ??
    toNumber(activity.duration) ??
    0;

  const activityName = activity.activityName?.trim() || "Sortie";
  const averagePower = toNumber(activity.avgPower);

  return {
    id: activity.activityId,
    title: activityName,
    activityName,
    activityType: activity.activityType?.typeKey ?? "",
    date: activity.startTimeLocal || activity.startTimeGMT,
    durationSeconds,
    durationLabel: formatDuration(durationSeconds),
    distance: toNumber(activity.distance),
    averageSpeed: toNumber(activity.averageSpeed),
    elevationGain: toNumber(activity.elevationGain),
    averageHR: toNumber(activity.averageHR),
    averagePower,
    averagePowerWatts: averagePower,
    steps: toNumber(activity.steps),
    tss: toNumber(activity.trainingStressScore),
    hasPolyline: activity.hasPolyline,
  };
}

async function importGarminConnect() {
  const { GarminConnect } = await import("garmin-connect");
  return GarminConnect;
}

type GarminConnectClient = {
  getActivities: (
    start?: number,
    limit?: number,
    activityType?: ActivityType
  ) => Promise<IActivity[]>;
  exportToken: () => IGarminTokens;
};

async function fetchActivitiesFromClient(
  client: GarminConnectClient,
  limit = GARMIN_HISTORY_LIMIT
): Promise<GarminActivitySummary[]> {
  try {
    const activities = await withDeadline(client.getActivities(0, limit), FETCH_BUDGET_MS);
    if (activities.length > 0) {
      return activities.map(mapActivity);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "timeout") {
      throw error;
    }
  }

  const recent = await client.getActivities(0, Math.min(limit, 40));
  const cycling = recent.filter(isCyclingActivity);
  const page = cycling.length > 0 ? cycling : recent;
  return page.slice(0, limit).map(mapActivity);
}

/** Lit l'historique sur l'instance déjà authentifiée, puis exporte ses jetons. */
export async function hotSyncGarminClient(
  client: GarminConnectClient,
  limit = GARMIN_HISTORY_LIMIT
): Promise<{ activities: GarminActivitySummary[]; tokens: IGarminTokens }> {
  const activities = await fetchActivitiesFromClient(client, limit);
  const exported = client.exportToken();

  return {
    activities,
    tokens: JSON.parse(JSON.stringify(exported)) as IGarminTokens,
  };
}

export async function syncGarminWithStoredTokens(
  tokens: IGarminTokens,
  limit = GARMIN_HISTORY_LIMIT
): Promise<{ activities: GarminActivitySummary[]; tokens: IGarminTokens }> {
  const GarminConnect = await importGarminConnect();
  const client = new GarminConnect({
    username: "session",
    password: "session",
  });
  client.loadToken(tokens.oauth1, tokens.oauth2);

  const activities = await fetchActivitiesFromClient(client, limit);

  return {
    activities,
    tokens: client.exportToken(),
  };
}

export async function syncGarminCyclingActivities(
  email: string,
  password: string
): Promise<
  | {
      status: "authenticated";
      activities: GarminActivitySummary[];
      tokens: IGarminTokens;
    }
  | { status: "mfa_required"; client: GarminLiveClient }
> {
  const { GarminLiveClient } = await import("@/lib/garminClient");
  const client = new GarminLiveClient();
  const step = await client.login(email, password);

  if (step === "mfa_required") {
    return { status: "mfa_required", client };
  }

  if (!client.tokens) {
    throw new Error("Connexion Garmin incomplète.");
  }

  const synced = await syncGarminWithStoredTokens(client.tokens);
  return {
    status: "authenticated",
    activities: synced.activities,
    tokens: synced.tokens,
  };
}

export async function completeCachedGarminMfa(
  client: GarminLiveClient,
  mfaCode: string
): Promise<{ activities: GarminActivitySummary[]; tokens: IGarminTokens }> {
  const tokens = await client.sendMfaCode(mfaCode);
  return syncGarminWithStoredTokens(tokens, GARMIN_HISTORY_LIMIT);
}

export function getGarminAuthErrorMessage(error: unknown): {
  message: string;
  status: number;
  sessionExpired?: boolean;
} {
  const raw =
    error instanceof Error ? error.message : "Échec de connexion à Garmin.";

  const lower = raw.toLowerCase();

  if (
    lower.includes("locked") ||
    lower.includes("invalid credentials") ||
    lower.includes("401") ||
    lower.includes("unauthorized") ||
    lower.includes("token") ||
    lower.includes("expired")
  ) {
    return {
      status: 401,
      sessionExpired: true,
      message: "Session Garmin expirée. Reconnectez-vous dans le profil.",
    };
  }

  if (lower.includes("timeout") || lower.includes("network")) {
    return {
      status: 503,
      message:
        "Garmin Connect est indisponible ou trop lent. Réessayez plus tard.",
    };
  }

  return {
    status: 502,
    message: "Impossible de synchroniser l'historique Garmin pour le moment.",
  };
}
