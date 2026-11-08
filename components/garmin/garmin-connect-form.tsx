"use client";

import { KeyRound, CheckCircle2, Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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

export function GarminConnectForm() {
  const setActivities = useGarminStore((s) => s.setActivities);
  const setSessionExpired = useGarminStore((s) => s.setSessionExpired);
  const lastSyncedAt = useGarminStore((s) => s.lastSyncedAt);
  const activityCount = useGarminStore((s) => s.activities.length);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    const payload = mfaRequired
      ? { mfaCode: mfaCode.trim() }
      : { email: email.trim(), password };

    try {
      const response = await fetch(
        mfaRequired ? "/api/garmin/mfa" : "/api/garmin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Synchronisation Garmin impossible.";
        setError(message);
        return;
      }

      if (
        typeof data === "object" &&
        data !== null &&
        "status" in data &&
        data.status === "MFA_REQUIRED"
      ) {
        setMfaRequired(true);
        setPassword("");
        setMfaCode("");
        return;
      }

      if (
        typeof data === "object" &&
        data !== null &&
        "activities" in data &&
        Array.isArray(data.activities)
      ) {
        setActivities(data.activities as GarminActivitySummary[]);
        setSessionExpired(false);
        setSuccess(true);
        setMfaRequired(false);
        setMfaCode("");
      }
    } catch {
      setError("Erreur réseau lors de la synchronisation Garmin.");
    } finally {
      if (!mfaRequired) {
        setPassword("");
      }
      setIsLoading(false);
    }
  }

  return (
    <Card className="rounded-3xl border border-zinc-800 bg-zinc-900 shadow-none">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Connexion Garmin</CardTitle>
        <CardDescription>
          Connecte ton compte pour synchroniser l&apos;historique vers le
          tableau de bord. Les identifiants ne sont jamais stockés dans le
          navigateur.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {!mfaRequired ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="garmin-email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
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
                  <Lock className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
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
                <KeyRound className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="garmin-mfa"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="pl-9 tracking-widest"
                  placeholder="123456"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Garmin a envoyé un code à {email || "ton compte"}. Il n&apos;est
                pas enregistré.
              </p>
              <button
                type="button"
                className="text-xs text-primary underline-offset-2 hover:underline"
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
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {mfaRequired ? "Vérification…" : "Connexion…"}
              </>
            ) : mfaRequired ? (
              "Soumettre le code"
            ) : (
              "Synchroniser l'historique"
            )}
          </Button>
        </form>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            <CheckCircle2 className="size-4" aria-hidden />
            Historique synchronisé. Consulte le tableau de bord sur l&apos;
            <Link href="/" className="underline underline-offset-2">
              page d&apos;accueil
            </Link>
            .
          </p>
        ) : null}

        {lastSyncedAt ? (
          <p className="text-xs text-muted-foreground">
            Dernière synchro :{" "}
            {new Date(lastSyncedAt).toLocaleString("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {activityCount > 0 ? ` · ${activityCount} sorties en cache` : null}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
