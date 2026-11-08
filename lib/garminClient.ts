import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

import type { IGarminTokens, IOauth1Token } from "garmin-connect/dist/garmin/types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36";

const SSO_ORIGIN = "https://sso.garmin.com";
const SSO_EMBED = `${SSO_ORIGIN}/sso/embed`;
const SIGNIN_URL = `${SSO_ORIGIN}/sso/signin`;
const GC_MODERN = "https://connect.garmin.com/modern";
const MFA_TTL_MS = 10 * 60 * 1000;

const CSRF_RE = /name="_csrf"\s+value="(.+?)"/;
const TICKET_RE = /ticket=([^"]+)"/;
const TITLE_RE = /<title>([^<]*)<\/title>/i;

type OauthCapableClient = {
  client: {
    fetchOauthConsumer: () => Promise<void>;
    getOauth1Token: (ticket: string) => Promise<{
      token: IOauth1Token;
      oauth: {
        authorize: (
          request: { url: string; method: string; data: null },
          token: { key: string; secret: string }
        ) => Record<string, string>;
      };
    }>;
    exchange: (oauth1: {
      token: IOauth1Token;
      oauth: {
        authorize: (
          request: { url: string; method: string; data: null },
          token: { key: string; secret: string }
        ) => Record<string, string>;
      };
    }) => Promise<void>;
  };
  exportToken: () => IGarminTokens;
};

export type GarminLoginStep = "authenticated" | "mfa_required";

/**
 * Session SSO vivante. garmin-connect n'expose pas sendMfaCode :
 * cette classe garde le même client HTTP (cookies) entre les deux requêtes.
 */
export class GarminLiveClient {
  userId = "";
  cachedAt = 0;
  tokens: IGarminTokens | null = null;

  private readonly jar = new CookieJar();
  private readonly http: AxiosInstance;
  private csrf = "";
  private signinUrl = "";

  constructor() {
    this.http = wrapper(
      axios.create({
        jar: this.jar,
        withCredentials: true,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
        headers: { "User-Agent": USER_AGENT },
      })
    );
  }

  async login(email: string, password: string): Promise<GarminLoginStep> {
    const embedUrl = `${SSO_EMBED}?${toQuery({
      clientId: "GarminConnect",
      locale: "en",
      service: GC_MODERN,
    })}`;
    await this.http.get(embedUrl);

    const widgetUrl = `${SIGNIN_URL}?${toQuery({
      id: "gauth-widget",
      embedWidget: true,
      locale: "en",
      gauthHost: SSO_EMBED,
    })}`;
    const widgetHtml = htmlFromResponse(await this.http.get<string>(widgetUrl));
    this.csrf = extractCsrf(widgetHtml);

    this.signinUrl = `${SIGNIN_URL}?${toQuery({
      id: "gauth-widget",
      embedWidget: true,
      clientId: "GarminConnect",
      locale: "en",
      gauthHost: SSO_EMBED,
      service: SSO_EMBED,
      source: SSO_EMBED,
      redirectAfterAccountLoginUrl: SSO_EMBED,
      redirectAfterAccountCreationUrl: SSO_EMBED,
    })}`;

    const loginHtml = htmlFromResponse(
      await this.http.post<string>(
        this.signinUrl,
        new URLSearchParams({
          username: email,
          password,
          embed: "true",
          _csrf: this.csrf,
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Origin: SSO_ORIGIN,
            Referer: SIGNIN_URL,
            Dnt: "1",
          },
        }
      )
    );

    const refreshedCsrf = CSRF_RE.exec(loginHtml)?.[1];
    if (refreshedCsrf) {
      this.csrf = refreshedCsrf;
    }

    const ticket = extractTicket(loginHtml);
    if (ticket) {
      this.tokens = await exchangeTicket(ticket);
      return "authenticated";
    }

    if (isCredentialFailure(loginHtml)) {
      throw new Error(
        "login failed (invalid credentials), please check username and password"
      );
    }

    if (/account locked|locked/i.test(loginHtml) && !isMfaChallenge(loginHtml)) {
      throw new Error(
        "login failed (AccountLocked), please open connect web page to unlock your account"
      );
    }

    if (isMfaChallenge(loginHtml) || !/name=["']username["']/i.test(loginHtml)) {
      return "mfa_required";
    }

    throw new Error(
      "login failed (Ticket not found), please check username and password"
    );
  }

  /** Soumet le code 2FA sur la même session HTTP que login(). */
  async sendMfaCode(code: string): Promise<IGarminTokens> {
    if (!this.csrf || !this.signinUrl) {
      throw new Error("Session MFA Garmin absente. Recommence la connexion.");
    }

    const html = htmlFromResponse(
      await this.http.post<string>(
        this.signinUrl,
        new URLSearchParams({
          "mfa-code": code.trim(),
          embed: "true",
          _csrf: this.csrf,
          fromPage: "setupEnterMfaCode",
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Origin: SSO_ORIGIN,
            Referer: this.signinUrl,
            Dnt: "1",
          },
        }
      )
    );

    const ticket = extractTicket(html);
    if (!ticket) {
      const refreshedCsrf = CSRF_RE.exec(html)?.[1];
      if (refreshedCsrf) {
        this.csrf = refreshedCsrf;
      }
      throw new Error("Code MFA invalide ou expiré.");
    }

    this.tokens = await exchangeTicket(ticket);
    return this.tokens;
  }
}

type GarminGlobal = typeof globalThis & {
  garminClient?: GarminLiveClient;
};

function garminGlobal(): GarminGlobal {
  return globalThis as GarminGlobal;
}

export function cacheGarminClient(userId: string, client: GarminLiveClient): void {
  client.userId = userId;
  client.cachedAt = Date.now();
  garminGlobal().garminClient = client;
}

export function getCachedGarminClient(userId: string): GarminLiveClient | null {
  const client = garminGlobal().garminClient;
  if (!client || client.userId !== userId) {
    return null;
  }

  if (Date.now() - client.cachedAt > MFA_TTL_MS) {
    garminGlobal().garminClient = undefined;
    return null;
  }

  return client;
}

export function clearCachedGarminClient(userId?: string): void {
  const client = garminGlobal().garminClient;
  if (!client) {
    return;
  }

  if (!userId || client.userId === userId) {
    garminGlobal().garminClient = undefined;
  }
}

function htmlFromResponse(response: AxiosResponse): string {
  if (typeof response.data === "string") {
    return response.data;
  }

  return JSON.stringify(response.data ?? "");
}

function extractCsrf(html: string): string {
  const match = CSRF_RE.exec(html);
  if (!match?.[1]) {
    throw new Error("Jeton CSRF Garmin introuvable.");
  }

  return match[1];
}

function extractTicket(html: string): string | null {
  return TICKET_RE.exec(html)?.[1] ?? null;
}

function isMfaChallenge(html: string): boolean {
  const title = TITLE_RE.exec(html)?.[1] ?? "";
  return (
    /mfa/i.test(title) ||
    /name=["']mfa-code["']/i.test(html) ||
    /enterMfa|verifyMfa|mfaToken/i.test(html) ||
    /verification code/i.test(html) ||
    /enter the code/i.test(html)
  );
}

function isCredentialFailure(html: string): boolean {
  return (
    /name=["']username["']/i.test(html) &&
    !/mfa-code/i.test(html) &&
    /invalid|incorrect|does not match|doesn't match|try again/i.test(html)
  );
}

function toQuery(params: Record<string, string | boolean>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value));
  }
  return search.toString();
}

async function exchangeTicket(ticket: string): Promise<IGarminTokens> {
  const { GarminConnect } = await import("garmin-connect");
  const client = new GarminConnect() as unknown as OauthCapableClient;
  await client.client.fetchOauthConsumer();
  const oauth1 = await client.client.getOauth1Token(ticket);
  await client.client.exchange(oauth1);
  return client.exportToken();
}
