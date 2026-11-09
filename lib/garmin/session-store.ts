import {
  sealGarminSession,
  unsealGarminSession,
  type StoredGarminSession,
} from "@/lib/garmin/session-crypto";
import { createClient } from "@/lib/supabase/server";

import type { IGarminTokens } from "garmin-connect/dist/garmin/types";

export type GarminSessionRecord = {
  tokens: IGarminTokens;
  garminUsername: string | null;
};

type GarminSessionRow = {
  session_data: {
    v: 1;
    sealed: string;
  };
  garmin_username: string | null;
};

function isSessionRow(value: unknown): value is GarminSessionRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const row = value as Partial<GarminSessionRow>;
  return (
    typeof row.session_data === "object" &&
    row.session_data !== null &&
    "sealed" in row.session_data &&
    typeof row.session_data.sealed === "string"
  );
}

/** Récupère et déchiffre la session Garmin de l'utilisateur courant. */
export async function getGarminSessionForUser(
  userId: string
): Promise<GarminSessionRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("garmin_sessions")
    .select("session_data, garmin_username")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[garmin-session] lecture impossible:", error.message);
    return null;
  }

  if (!data || !isSessionRow(data)) {
    return null;
  }

  const session = unsealGarminSession(data.session_data.sealed);
  if (!session || session.userId !== userId) {
    return null;
  }

  return {
    tokens: session.tokens,
    garminUsername: data.garmin_username,
  };
}

/**
 * Chiffre et upsert la session Garmin pour l'utilisateur Supabase.
 * Si `garminUsername` est omis, le nom existant est conservé.
 */
export async function saveGarminSessionForUser(
  userId: string,
  tokens: IGarminTokens,
  garminUsername?: string | null
): Promise<void> {
  const payload: StoredGarminSession = {
    v: 1,
    userId,
    tokens,
  };

  const sealed = sealGarminSession(payload);
  const supabase = await createClient();

  const row: {
    user_id: string;
    session_data: { v: 1; sealed: string };
    updated_at: string;
    garmin_username?: string;
  } = {
    user_id: userId,
    session_data: { v: 1, sealed },
    updated_at: new Date().toISOString(),
  };

  const trimmed = garminUsername?.trim();
  if (trimmed) {
    row.garmin_username = trimmed;
  }

  const { error } = await supabase
    .from("garmin_sessions")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    throw new Error(
      `Impossible d'enregistrer la session Garmin: ${error.message}`
    );
  }
}

/** Efface la session Garmin de l'utilisateur dans Supabase. */
export async function clearGarminSessionForUser(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("garmin_sessions")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Impossible de supprimer la session Garmin: ${error.message}`
    );
  }
}
