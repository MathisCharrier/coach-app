import type { GarminMfaChallenge } from "@/lib/garmin/sso-login";

const TTL_MS = 10 * 60 * 1000;

type PendingMfa = GarminMfaChallenge & {
  createdAt: number;
};

type GarminMfaGlobal = typeof globalThis & {
  __garminMfaSessions?: Map<string, PendingMfa>;
};

function sessions(): Map<string, PendingMfa> {
  const root = globalThis as GarminMfaGlobal;
  if (!root.__garminMfaSessions) {
    root.__garminMfaSessions = new Map();
  }
  return root.__garminMfaSessions;
}

export function rememberGarminMfaSession(
  userId: string,
  challenge: GarminMfaChallenge
): void {
  sessions().set(userId, {
    ...challenge,
    createdAt: Date.now(),
  });
}

export function readGarminMfaSession(
  userId: string
): GarminMfaChallenge | null {
  const pending = sessions().get(userId);
  if (!pending) {
    return null;
  }

  if (Date.now() - pending.createdAt > TTL_MS) {
    sessions().delete(userId);
    return null;
  }

  return {
    csrf: pending.csrf,
    signinUrl: pending.signinUrl,
    jar: pending.jar,
  };
}

export function clearGarminMfaSession(userId: string): void {
  sessions().delete(userId);
}
