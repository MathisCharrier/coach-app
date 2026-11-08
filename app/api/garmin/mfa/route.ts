import { NextResponse } from "next/server";
import { z } from "zod";

import {
  clearCachedGarminClient,
  getCachedGarminClient,
} from "@/lib/garminClient";
import { clearGarminSessionCookie, saveGarminSessionForUser } from "@/lib/garmin/session-cookie";
import {
  completeCachedGarminMfa,
  getGarminAuthErrorMessage,
} from "@/lib/garmin/sync-cycling-activities";
import { createClient } from "@/lib/supabase/server";

const mfaSchema = z.object({
  mfaCode: z
    .string()
    .trim()
    .min(4, "Le code MFA est trop court.")
    .max(12, "Le code MFA est trop long."),
});

export async function POST(request: Request) {
  try {
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
        {
          status: "MFA_REQUIRED",
          error: "Code de vérification invalide.",
        },
        { status: 400 }
      );
    }

    const garminClient = getCachedGarminClient(user.id);
    if (!garminClient) {
      return NextResponse.json(
        {
          status: "MFA_EXPIRED",
          error:
            "La session Garmin a expiré entre les deux étapes. Recommence la connexion.",
        },
        { status: 409 }
      );
    }

    const { activities, tokens } = await completeCachedGarminMfa(
      garminClient,
      parsed.data.mfaCode
    );

    await saveGarminSessionForUser(user.id, tokens);
    clearCachedGarminClient(user.id);

    return NextResponse.json({
      status: "AUTHENTICATED",
      activities,
      count: activities.length,
    });
  } catch (error) {
    if (error instanceof Error && /code mfa/i.test(error.message)) {
      return NextResponse.json(
        {
          status: "MFA_REQUIRED",
          error: "Code de vérification invalide ou expiré.",
        },
        { status: 401 }
      );
    }

    clearCachedGarminClient();

    const { message, status } = getGarminAuthErrorMessage(error);
    if (status === 401) {
      await clearGarminSessionCookie();
    }

    return NextResponse.json({ error: message }, { status });
  }
}
