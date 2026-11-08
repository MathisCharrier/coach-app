import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar, type SerializedCookieJar } from "tough-cookie";

import type { IGarminTokens, IOauth1Token } from "garmin-connect/dist/garmin/types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36";

const SSO_ORIGIN = "https://sso.garmin.com";
const SSO_EMBED = `${SSO_ORIGIN}/sso/embed`;
const SIGNIN_URL = `${SSO_ORIGIN}/sso/signin`;
const GC_MODERN = "https://connect.garmin.com/modern";

const CSRF_RE = /name="_csrf"\s+value="(.+?)"/;
const TICKET_RE = /ticket=([^"]+)"/;
const TITLE_RE = /<title>([^<]*)<\/title>/i;

export type GarminMfaChallenge = {
  csrf: string;
  signinUrl: string;
  jar: SerializedCookieJar;
};

export type GarminPasswordLoginResult =
  | { status: "authenticated"; tokens: IGarminTokens }
  | { status: "mfa_required"; challenge: GarminMfaChallenge };

type OauthCapableClient = {
  client: {
    fetchOauthConsumer: () => Promise<void>;
    getOauth1Token: (ticket: string) => Promise<{
      token: IOauth1Token;
      oauth: {
        authorize: (
          request: { url: string; method: string; data: null },
          token: { key: string; secret: string }
        ) => Record<string, string>
      };
    }>;
    exchange: (oauth1: {
      token: IOauth1Token;
      oauth: {
        authorize: (
          request: { url: string; method: string; data: null },
          token: { key: string; secret: string }
        ) => Record<string, string>
      };
    }) => Promise<void>;
  };
  exportToken: () => IGarminTokens;
};

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
    /invalid|incorrect|does not match|doesn't match|try again|locked/i.test(html)
  );
}

function createSsoClient(jar: CookieJar): AxiosInstance {
  return wrapper(
    axios.create({
      jar,
      withCredentials: true,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
      headers: {
        "User-Agent": USER_AGENT,
      },
    })
  );
}

async function exchangeTicket(ticket: string): Promise<IGarminTokens> {
  const { GarminConnect } = await import("garmin-connect");
  const client = new GarminConnect() as unknown as OauthCapableClient;
  await client.client.fetchOauthConsumer();
  const oauth1 = await client.client.getOauth1Token(ticket);
  await client.client.exchange(oauth1);
  return client.exportToken();
}

function toQuery(params: Record<string, string | boolean>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value));
  }
  return search.toString();
}

export async function beginGarminLogin(
  email: string,
  password: string
): Promise<GarminPasswordLoginResult> {
  const jar = new CookieJar();
  const client = createSsoClient(jar);

  const embedUrl = `${SSO_EMBED}?${toQuery({
    clientId: "GarminConnect",
    locale: "en",
    service: GC_MODERN,
  })}`;
  await client.get(embedUrl);

  const widgetUrl = `${SIGNIN_URL}?${toQuery({
    id: "gauth-widget",
    embedWidget: true,
    locale: "en",
    gauthHost: SSO_EMBED,
  })}`;
  const widgetResponse = await client.get<string>(widgetUrl);
  const csrf = extractCsrf(htmlFromResponse(widgetResponse));

  const signinUrl = `${SIGNIN_URL}?${toQuery({
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
  const loginResponse = await client.post<string>(
    signinUrl,
    new URLSearchParams({
      username: email,
      password,
      embed: "true",
      _csrf: csrf,
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: SSO_ORIGIN,
        Referer: SIGNIN_URL,
        Dnt: "1",
      },
    }
  );

  const html = htmlFromResponse(loginResponse);
  const ticket = extractTicket(html);

  if (ticket) {
    return {
      status: "authenticated",
      tokens: await exchangeTicket(ticket),
    };
  }

  if (isCredentialFailure(html)) {
    throw new Error(
      "login failed (invalid credentials), please check username and password"
    );
  }

  if (isMfaChallenge(html) || !/name=["']username["']/i.test(html)) {
    const mfaCsrf = CSRF_RE.exec(html)?.[1] ?? csrf;
    return {
      status: "mfa_required",
      challenge: {
        csrf: mfaCsrf,
        signinUrl,
        jar: await jar.serialize(),
      },
    };
  }

  if (/account locked|locked/i.test(html)) {
    throw new Error(
      "login failed (AccountLocked), please open connect web page to unlock your account"
    );
  }

  throw new Error(
    "login failed (Ticket not found), please check username and password"
  );
}

export async function submitGarminMfaCode(
  challenge: GarminMfaChallenge,
  mfaCode: string
): Promise<IGarminTokens> {
  const jar = await CookieJar.deserialize(challenge.jar);
  const client = createSsoClient(jar);

  const response = await client.post<string>(
    challenge.signinUrl,
    new URLSearchParams({
      "mfa-code": mfaCode.trim(),
      embed: "true",
      _csrf: challenge.csrf,
      fromPage: "setupEnterMfaCode",
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: SSO_ORIGIN,
        Referer: challenge.signinUrl,
        Dnt: "1",
      },
    }
  );

  const html = htmlFromResponse(response);
  const ticket = extractTicket(html);

  if (!ticket) {
    throw new Error("Code MFA invalide ou expiré.");
  }

  return exchangeTicket(ticket);
}
