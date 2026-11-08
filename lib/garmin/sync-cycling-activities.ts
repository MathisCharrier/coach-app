import type { IActivity } from "garmin-connect/dist/garmin/types/activity";
import { ActivityType } from "garmin-connect/dist/garmin/types/activity";
import type { IGarminTokens } from "garmin-connect/dist/garmin/types";

import { formatDuration, toNumber } from "@/lib/garmin/format";
import type { GarminLiveClient } from "@/lib/garminClient";
import type { GarminActivitySummary } from "@/lib/garmin/types";

const CYCLING_FETCH_LIMIT = 10;

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

  return {
    id: activity.activityId,
    title: activity.activityName?.trim() || "Sortie vélo",
    date: activity.startTimeLocal || activity.startTimeGMT,
    durationSeconds,
    durationLabel: formatDuration(durationSeconds),
    averagePowerWatts: toNumber(activity.avgPower),
    tss: toNumber(activity.trainingStressScore),
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

async function fetchCyclingActivitiesFromClient(
  client: GarminConnectClient,
  limit = CYCLING_FETCH_LIMIT
): Promise<GarminActivitySummary[]> {
  let activities: IActivity[] = [];

  try {
    activities = await client.getActivities(0, limit, ActivityType.Cycling);
  } catch {
    const recent = await client.getActivities(0, 40);
    activities = recent.filter(isCyclingActivity).slice(0, limit);
  }

  if (activities.length === 0) {
    const recent = await client.getActivities(0, 40);
    activities = recent.filter(isCyclingActivity).slice(0, limit);
  }

  return activities.map(mapActivity);
}

export async function syncGarminWithStoredTokens(
  tokens: IGarminTokens,
  limit = CYCLING_FETCH_LIMIT
): Promise<{ activities: GarminActivitySummary[]; tokens: IGarminTokens }> {
  const GarminConnect = await importGarminConnect();
  const client = new GarminConnect();
  client.loadToken(tokens.oauth1, tokens.oauth2);

  const activities = await fetchCyclingActivitiesFromClient(client, limit);

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
  return syncGarminWithStoredTokens(tokens, 5);
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
