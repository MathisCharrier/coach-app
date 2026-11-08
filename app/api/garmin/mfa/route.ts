import { NextResponse } from "next/server";
import { z } from "zod";

import {
  clearGarminMfaChallenge,
  readGarminMfaChallenge,
} from "@/lib/garmin/mfa-cookie";
import { saveGarminSessionForUser } from "@/lib/garmin/session-cookie";
import { submitGarminMfaCode } from "@/lib/garmin/sso-login";
import { createClient } from "@/lib/supabase/server";

const mfaSchema = z.object({
  mfaCode: z.string().trim().min(4).max(12),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const parsed = mfaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Code de vérification invalide." },
      { status: 400 }
    );
  }

  const challenge = await readGarminMfaChallenge(user.id);
  if (!challenge) {
    return NextResponse.json(
      {
        status: "MFA_EXPIRED",
        error: "La vérification Garmin a expiré. Recommence avec l'e-mail et le mot de passe.",
      },
      { status: 409 }
    );
  }

  try {
    const synced = await submitGarminMfaCode(challenge, parsed.data.mfaCode);
    await saveGarminSessionForUser(user.id, synced.tokens);
    await clearGarminMfaChallenge();

    return NextResponse.json({
      status: "AUTHENTICATED",
      connected: true,
      activities: synced.activities,
      count: synced.activities.length,
      sessionExpired: false,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";

    if (/GARMIN_SESSION_SECRET/i.test(raw)) {
      return NextResponse.json(
        { error: "GARMIN_SESSION_SECRET manquant sur le serveur." },
        { status: 500 }
      );
    }

    if (/code mfa/i.test(raw)) {
      return NextResponse.json(
        {
          status: "MFA_REQUIRED",
          error: "Code MFA invalide ou expiré.",
        },
        { status: 401 }
      );
    }

    await clearGarminMfaChallenge();
    return NextResponse.json(
      { error: "Impossible de terminer la connexion Garmin." },
      { status: 502 }
    );
  }
}
