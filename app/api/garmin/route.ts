import { NextResponse } from "next/server";
import { z } from "zod";

import {
  clearGarminMfaChallenge,
  saveGarminMfaChallenge,
} from "@/lib/garmin/mfa-cookie";
import {
  clearGarminSessionForUser,
  getGarminSessionForUser,
  saveGarminSessionForUser,
} from "@/lib/garmin/session-store";
import { beginGarminLogin } from "@/lib/garmin/sso-login";
import {
  GARMIN_HISTORY_LIMIT,
  getGarminAuthErrorMessage,
  syncGarminWithStoredTokens,
} from "@/lib/garmin/sync-cycling-activities";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 10;

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
  const user = await requireUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise.", connected: false },
      { status: 401 }
    );
  }

  const stored = await getGarminSessionForUser(user.id);
  if (!stored) {
    return NextResponse.json({
      connected: false,
      activities: [],
      count: 0,
      sessionExpired: false,
      garminUsername: null,
    });
  }

  try {
    const { activities, tokens } = await syncGarminWithStoredTokens(
      stored.tokens,
      GARMIN_HISTORY_LIMIT
    );
    await saveGarminSessionForUser(user.id, tokens, stored.garminUsername);

    return NextResponse.json({
      connected: true,
      activities,
      count: activities.length,
      sessionExpired: false,
      garminUsername: stored.garminUsername,
    });
  } catch (error) {
    const { message, status, sessionExpired } = getGarminAuthErrorMessage(error);
    if (sessionExpired) {
      console.error("[garmin-sync] stored session rejected");
      await clearGarminSessionForUser(user.id);
    }

    return NextResponse.json(
      {
        connected: false,
        activities: [],
        count: 0,
        sessionExpired: Boolean(sessionExpired),
        garminUsername: null,
        error: message,
      },
      { status }
    );
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise.", connected: false },
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

  try {
    const { email, password } = loginRequest.data;
    const result = await beginGarminLogin(email, password);

    if (result.status === "mfa_required") {
      await saveGarminMfaChallenge(user.id, result.challenge);
      return NextResponse.json({
        status: "MFA_REQUIRED",
        message:
          "Garmin demande un code de vérification. Saisis le code reçu par e-mail ou SMS.",
      });
    }

    await saveGarminSessionForUser(user.id, result.tokens, email);
    await clearGarminMfaChallenge();

    return NextResponse.json({
      status: "AUTHENTICATED",
      connected: true,
      activities: result.activities,
      count: result.activities.length,
      sessionExpired: false,
      garminUsername: email,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";

    if (/GARMIN_SESSION_SECRET/i.test(raw)) {
      return NextResponse.json(
        { error: "GARMIN_SESSION_SECRET manquant sur le serveur." },
        { status: 500 }
      );
    }

    if (/invalid credentials/i.test(raw)) {
      return NextResponse.json(
        { error: "E-mail ou mot de passe Garmin incorrect." },
        { status: 401 }
      );
    }

    const { message, status } = getGarminAuthErrorMessage(error);
    return NextResponse.json({ error: message }, { status });
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

  await clearGarminMfaChallenge();
  await clearGarminSessionForUser(user.id);
  return NextResponse.json({ ok: true, connected: false, garminUsername: null });
}
