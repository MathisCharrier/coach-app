import { cookies } from "next/headers";

import {
  sealGarminSession,
  unsealGarminSession,
  type StoredGarminSession,
} from "@/lib/garmin/session-crypto";

import type { IGarminTokens } from "garmin-connect/dist/garmin/types";

export const GARMIN_SESSION_COOKIE = "coach_garmin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function getGarminSessionForUser(
  userId: string
): Promise<IGarminTokens | null> {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(GARMIN_SESSION_COOKIE)?.value;
  if (!sealed) {
    return null;
  }

  const session = unsealGarminSession(sealed);
  if (!session || session.userId !== userId) {
    return null;
  }

  return session.tokens;
}

export async function saveGarminSessionForUser(
  userId: string,
  tokens: IGarminTokens
): Promise<void> {
  const payload: StoredGarminSession = {
    v: 1,
    userId,
    tokens,
  };

  const sealed = sealGarminSession(payload);
  const cookieStore = await cookies();

  cookieStore.set(GARMIN_SESSION_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearGarminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GARMIN_SESSION_COOKIE);
}
