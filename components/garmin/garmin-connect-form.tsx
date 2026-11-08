"use client";

import { CheckCircle2, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GarminActivitySummary } from "@/lib/garmin/types";
import { useGarminStore } from "@/store/useGarminStore";

type GarminPayload = {
  connected?: boolean;
  sessionExpired?: boolean;
  status?: string;
  activities?: GarminActivitySummary[];
  error?: string;
};

export function GarminConnectForm() {
  const setActivities = useGarminStore((state) => state.setActivities);
  const setSessionExpired = useGarminStore((state) => state.setSessionExpired);
  const clearActivities = useGarminStore((state) => state.clearActivities);
  const lastSyncedAt = useGarminStore((state) => state.lastSyncedAt);
  const activityCount = useGarminStore((state) => state.activities.length);

  const [connected, setConnected] = useState<boolean | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const response = await fetch("/api/garmin");
        const data = (await response.json()) as GarminPayload;
        if (cancelled) {
          return;
        }

        const isConnected = data.connected === true;
        setConnected(isConnected);
        setSessionExpired(data.sessionExpired === true);

        if (isConnected && Array.isArray(data.activities)) {
          setActivities(data.activities);
        }
      } catch {
        if (!cancelled) {
          setConnected(false);
        }
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [setActivities, setSessionExpired]);

  function applyActivities(data: GarminPayload) {
    if (Array.isArray(data.activities)) {
      setActivities(data.activities);
    }
    setSessionExpired(false);
    setConnected(true);
    setMfaRequired(false);
    setPassword("");
    setMfaCode("");
    setNotice("Historique synchronisé.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(mfaRequired ? "/api/garmin/mfa" : "/api/garmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mfaRequired
            ? { mfaCode: mfaCode.trim() }
            : { email: email.trim(), password }
        ),
      });
      const data = (await response.json()) as GarminPayload;

      if (data.status === "MFA_REQUIRED") {
        setMfaRequired(true);
        setPassword("");
        setError(data.error ?? null);
        return;
      }

      if (data.status === "MFA_EXPIRED") {
        setMfaRequired(false);
        setError(data.error ?? "La vérification a expiré.");
        return;
      }

      if (data.status === "AUTHENTICATED" && Array.isArray(data.activities)) {
        setActivities(data.activities);
        setSessionExpired(false);
        setPassword("");
        setMfaCode("");
        router.push("/");
        return;
      }

      if (!response.ok || data.connected === false) {
        setError(data.error ?? "Connexion Garmin impossible.");
        return;
      }

      applyActivities(data);
    } catch {
      setError("Erreur réseau lors de la connexion Garmin.");
    } finally {
      setBusy(false);
    }
  }

  async function synchronize() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/garmin");
      const data = (await response.json()) as GarminPayload;
      if (data.connected && Array.isArray(data.activities)) {
        applyActivities(data);
        return;
      }

      setConnected(false);
      setSessionExpired(true);
      setError(data.error ?? "La session Garmin n'est plus valide.");
    } catch {
      setError("Erreur réseau lors de la synchronisation.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await fetch("/api/garmin", { method: "DELETE" });
      clearActivities();
      setSessionExpired(false);
      setConnected(false);
      setMfaRequired(false);
    } catch {
      setError("Impossible de déconnecter Garmin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Connexion Garmin</CardTitle>
        <CardDescription>
          Le mot de passe n&apos;est pas enregistré. Une fois la connexion
          réussie, seuls les jetons de session sont conservés dans un cookie
          chiffré.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-sm text-orange-700">
              <CheckCircle2 className="size-4" aria-hidden />
              Connecté à Garmin
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void synchronize()} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Synchroniser
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void disconnect()}
                disabled={busy}
              >
                Déconnecter
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {connected === null ? (
              <p className="text-sm text-zinc-500">Vérification de la session…</p>
            ) : null}
            {!mfaRequired ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="garmin-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="garmin-email"
                      type="email"
                      autoComplete="username"
                      className="pl-9"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="garmin-password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="garmin-password"
                      type="password"
                      autoComplete="current-password"
                      className="pl-9"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="garmin-mfa">Code de vérification Garmin</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="garmin-mfa"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="pl-9 tracking-widest"
                    value={mfaCode}
                    onChange={(event) => setMfaCode(event.target.value)}
                    required
                  />
                </div>
                <button
                  type="button"
                  className="text-xs text-zinc-400 underline-offset-2 hover:underline"
                  onClick={() => {
                    setMfaRequired(false);
                    setMfaCode("");
                    setError(null);
                  }}
                >
                  Revenir aux identifiants
                </button>
              </div>
            )}
            <Button type="submit" disabled={busy || connected === null} className="w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mfaRequired ? "Soumettre le code" : "Se connecter"}
            </Button>
          </form>
        )}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="text-sm text-orange-700">
            {notice}{" "}
            <Link href="/" className="underline underline-offset-2">
              Voir le tableau de bord
            </Link>
          </p>
        ) : null}

        {lastSyncedAt && activityCount > 0 ? (
          <p className="text-xs text-zinc-500">
            {activityCount} sorties en cache ·{" "}
            {new Date(lastSyncedAt).toLocaleString("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
