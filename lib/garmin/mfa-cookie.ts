import { cookies } from "next/headers";

import type { GarminMfaChallenge } from "@/lib/garmin/sso-login";
import { sealPayload, unsealPayload } from "@/lib/garmin/session-crypto";

const MFA_COOKIE = "coach_garmin_mfa";
const MAX_AGE_SECONDS = 10 * 60;

type StoredMfaChallenge = {
  v: 1;
  userId: string;
  challenge: GarminMfaChallenge;
};

function isChallenge(value: unknown): value is GarminMfaChallenge {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const challenge = value as GarminMfaChallenge;
  return (
    typeof challenge.csrf === "string" &&
    typeof challenge.signinUrl === "string" &&
    typeof challenge.jar === "object" &&
    challenge.jar !== null
  );
}

export async function saveGarminMfaChallenge(
  userId: string,
  challenge: GarminMfaChallenge
): Promise<void> {
  const payload: StoredMfaChallenge = {
    v: 1,
    userId,
    challenge,
  };

  const cookieStore = await cookies();
  cookieStore.set(MFA_COOKIE, sealPayload(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readGarminMfaChallenge(
  userId: string
): Promise<GarminMfaChallenge | null> {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(MFA_COOKIE)?.value;
  if (!sealed) {
    return null;
  }

  const parsed = unsealPayload(sealed);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("userId" in parsed) ||
    !("challenge" in parsed)
  ) {
    return null;
  }

  const stored = parsed as StoredMfaChallenge;
  if (stored.userId !== userId || !isChallenge(stored.challenge)) {
    return null;
  }

  return stored.challenge;
}

export async function clearGarminMfaChallenge(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(MFA_COOKIE);
}
