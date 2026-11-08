import { NextResponse } from "next/server";
import { z } from "zod";

import {
  cacheGarminClient,
  clearCachedGarminClient,
} from "@/lib/garminClient";
import {
  clearGarminSessionCookie,
  getGarminSessionForUser,
  saveGarminSessionForUser,
} from "@/lib/garmin/session-cookie";
import {
  getGarminAuthErrorMessage,
  syncGarminCyclingActivities,
  syncGarminWithStoredTokens,
} from "@/lib/garmin/sync-cycling-activities";
import { createClient } from "@/lib/supabase/server";

const garminLoginSchema = z.object({
  email: z.string().trim().email("Adresse e-mail Garmin invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentification requise.", sessionExpired: true },
        { status: 401 }
      );
    }

    const storedTokens = await getGarminSessionForUser(user.id);
    if (!storedTokens) {
      return NextResponse.json({
        activities: [],
        count: 0,
        sessionExpired: true,
        silent: true,
      });
    }

    const { activities, tokens } = await syncGarminWithStoredTokens(
      storedTokens,
      5
    );
    await saveGarminSessionForUser(user.id, tokens);

    return NextResponse.json({
      activities,
      count: activities.length,
      sessionExpired: false,
    });
  } catch (error) {
    console.error("[garmin-sync] silent refresh failed");
    await clearGarminSessionCookie();

    const { message } = getGarminAuthErrorMessage(error);

    return NextResponse.json({
      activities: [],
      count: 0,
      sessionExpired: true,
      silent: true,
      error: message,
    });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentification requise." },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide." },
        { status: 400 }
      );
    }

    const loginRequest = garminLoginSchema.safeParse(body);
    if (!loginRequest.success) {
      return NextResponse.json(
        {
          error: "Paramètres invalides.",
          details: z.treeifyError(loginRequest.error),
        },
        { status: 400 }
      );
    }

    const { email, password } = loginRequest.data;
    const result = await syncGarminCyclingActivities(email, password);

    if (result.status === "mfa_required") {
      cacheGarminClient(user.id, result.client);
      return NextResponse.json({
        status: "MFA_REQUIRED",
        message:
          "Garmin demande un code de vérification. Saisis le code reçu par e-mail ou application.",
      });
    }

    try {
      await saveGarminSessionForUser(user.id, result.tokens);
    } catch {
      return NextResponse.json(
        {
          error:
            "Session Garmin non persistée : configurez GARMIN_SESSION_SECRET sur le serveur.",
        },
        { status: 500 }
      );
    }

    clearCachedGarminClient(user.id);

    return NextResponse.json({
      status: "AUTHENTICATED",
      activities: result.activities.slice(0, 5),
      count: Math.min(result.activities.length, 5),
      sessionExpired: false,
    });
  } catch (error) {
    clearCachedGarminClient();

    const { message, status, sessionExpired } =
      getGarminAuthErrorMessage(error);

    if (sessionExpired) {
      await clearGarminSessionCookie();
    }

    return NextResponse.json({ error: message, sessionExpired }, { status });
  }
}

export async function DELETE() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 }
    );
  }

  clearCachedGarminClient(user.id);
  await clearGarminSessionCookie();
  return NextResponse.json({ ok: true });
}
