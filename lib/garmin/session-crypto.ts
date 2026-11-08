import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

import type { IGarminTokens } from "garmin-connect/dist/garmin/types";

export type StoredGarminSession = {
  v: 1;
  userId: string;
  tokens: IGarminTokens;
};

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env.GARMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "GARMIN_SESSION_SECRET manquant ou trop court (32 caractères minimum)."
    );
  }

  return createHash("sha256").update(secret).digest();
}

export function sealPayload(value: unknown): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function unsealPayload(sealed: string): unknown | null {
  try {
    const key = getEncryptionKey();
    const buffer = Buffer.from(sealed, "base64url");

    if (buffer.length < IV_LENGTH + 16) {
      return null;
    }

    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = buffer.subarray(IV_LENGTH + 16);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

export function sealGarminSession(session: StoredGarminSession): string {
  return sealPayload(session);
}

export function unsealGarminSession(
  sealed: string
): StoredGarminSession | null {
  const parsed = unsealPayload(sealed);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("userId" in parsed) ||
    !("tokens" in parsed) ||
    typeof (parsed as StoredGarminSession).userId !== "string"
  ) {
    return null;
  }

  return parsed as StoredGarminSession;
}
