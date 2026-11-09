import { NextResponse } from "next/server";

import { fetchGarminRoute } from "@/lib/garmin/activity-route";
import {
  clearGarminSessionForUser,
  getGarminSessionForUser,
} from "@/lib/garmin/session-store";
import { getGarminAuthErrorMessage } from "@/lib/garmin/sync-cycling-activities";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const activityId = Number(id);
  if (!Number.isInteger(activityId) || activityId <= 0) {
    return NextResponse.json({ error: "Activité invalide." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const stored = await getGarminSessionForUser(user.id);
  if (!stored) {
    return NextResponse.json(
      {
        coordinates: [],
        connected: false,
        sessionExpired: true,
        error: "Session Garmin expirée. Reconnectez-vous dans le profil.",
      },
      { status: 401 }
    );
  }

  try {
    const coordinates = await fetchGarminRoute(stored.tokens, activityId);
    return NextResponse.json({ coordinates, connected: true });
  } catch (error) {
    const { message, status, sessionExpired } = getGarminAuthErrorMessage(error);
    if (sessionExpired) {
      await clearGarminSessionForUser(user.id);
    }

    return NextResponse.json(
      {
        coordinates: [],
        connected: false,
        sessionExpired: Boolean(sessionExpired),
        error: message,
      },
      { status }
    );
  }
}
