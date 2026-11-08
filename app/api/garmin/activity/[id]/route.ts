import { NextResponse } from "next/server";

import { fetchGarminRoute } from "@/lib/garmin/activity-route";
import { getGarminSessionForUser } from "@/lib/garmin/session-cookie";
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

  const tokens = await getGarminSessionForUser(user.id);
  if (!tokens) {
    return NextResponse.json({ coordinates: [], connected: false });
  }

  try {
    const coordinates = await fetchGarminRoute(tokens, activityId);
    return NextResponse.json({ coordinates });
  } catch (error) {
    const { message, status } = getGarminAuthErrorMessage(error);
    return NextResponse.json({ coordinates: [], error: message }, { status });
  }
}
