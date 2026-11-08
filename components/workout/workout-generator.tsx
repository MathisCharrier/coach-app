"use client";

import { Loader2, Sparkles, Zap } from "lucide-react";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { useAthleteStore } from "@/store/useAthleteStore";
import { useWorkoutPlanStore } from "@/store/useWorkoutPlanStore";

const FATIGUE_OPTIONS = [
  { value: "très fatigué", label: "Très fatigué" },
  { value: "fatigué", label: "Fatigué" },
  { value: "normal", label: "Normal" },
  { value: "en pleine forme", label: "En pleine forme" },
] as const;

type WorkoutResult = {
  title: string;
  description: string;
  intervals: Array<{
    duration: number;
    targetPower: number;
  }>;
};

export function WorkoutGenerator() {
  const athleteFtp = useAthleteStore((s) => s.ftpWatts);
  const addWorkout = useWorkoutPlanStore((s) => s.addWorkout);
  const [ftp, setFtp] = useState(String(athleteFtp));
  const [fatigueLevel, setFatigueLevel] =
    useState<(typeof FATIGUE_OPTIONS)[number]["value"]>("normal");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WorkoutResult | null>(null);

  async function handleGenerate() {
    setError(null);
    setResult(null);

    const parsedFtp = Number(ftp);
    if (!Number.isFinite(parsedFtp) || parsedFtp <= 0) {
      setError("La FTP doit être un nombre strictement positif.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/generate-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ftp: parsedFtp,
          fatigueLevel,
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "La génération a échoué.";
        setError(message);
        return;
      }

      const workout = data as WorkoutResult;
      setResult(workout);

      addWorkout({
        title: workout.title,
        description: workout.description,
        totalDurationSeconds: workout.intervals.reduce(
          (sum, interval) => sum + interval.duration,
          0
        ),
        intervalCount: workout.intervals.length,
      });
    } catch {
      setError(
        "Impossible de contacter le serveur. Vérifiez votre connexion."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Card className="h-full rounded-3xl border border-zinc-800 bg-zinc-900 shadow-none">
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="size-5" aria-hidden />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Générateur d&apos;entraînement
          </CardTitle>
          <CardDescription>
            Génération algorithmique : indique ta FTP et ton niveau de fatigue
            pour obtenir une séance structurée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ftp">FTP (watts)</Label>
              <div className="relative">
                <Zap
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="ftp"
                  type="number"
                  min={1}
                  max={600}
                  step={1}
                  value={ftp}
                  onChange={(event) => setFtp(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fatigue">Niveau de fatigue</Label>
              <NativeSelect
                id="fatigue"
                className="w-full"
                value={fatigueLevel}
                onChange={(event) =>
                  setFatigueLevel(
                    event.target.value as (typeof FATIGUE_OPTIONS)[number]["value"]
                  )
                }
              >
                {FATIGUE_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Génération…
              </>
            ) : (
              "Générer l'entraînement"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base font-medium">Résultat</CardTitle>
          <CardDescription>
            Séance calculée (zones % FTP) au format JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Génération en cours...
            </div>
          ) : error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : result ? (
            <pre className="max-h-[28rem] overflow-auto rounded-lg border border-border/60 bg-background/80 p-4 font-mono text-xs leading-relaxed text-foreground">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              Lance une génération pour afficher la séance ici.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
