"use client";

import {
  Activity,
  Bluetooth,
  Loader2,
  Radio,
  Unplug,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTrainerStore } from "@/store/useTrainerStore";
import { cn } from "cn";

function LiveMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center sm:items-end">
      <span className="text-[0.65rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </span>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-5xl leading-none font-bold tabular-nums tracking-tight text-foreground sm:text-6xl md:text-7xl">
          {Math.round(value)}
        </span>
        <span className="pb-1 text-sm font-medium text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

export function TrainingStatusBanner() {
  const isConnected = useTrainerStore((s) => s.isConnected);
  const isSimulator = useTrainerStore((s) => s.isSimulator);
  const isScanning = useTrainerStore((s) => s.isScanning);
  const device = useTrainerStore((s) => s.device);
  const power = useTrainerStore((s) => s.power);
  const cadence = useTrainerStore((s) => s.cadence);
  const error = useTrainerStore((s) => s.error);

  const scanAndConnect = useTrainerStore((s) => s.scanAndConnect);
  const setSimulatorMode = useTrainerStore((s) => s.setSimulatorMode);
  const resetError = useTrainerStore((s) => s.resetError);

  const statusLabel = isSimulator
    ? "Simulateur"
    : isConnected
      ? "Connecté FTMS"
      : isScanning
        ? "Connexion…"
        : "Hors ligne";

  const statusTone = isSimulator
    ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
    : isConnected
      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
      : isScanning
        ? "bg-sky-500/15 text-sky-200 ring-sky-500/30"
        : "bg-muted/50 text-muted-foreground ring-border/60";

  return (
    <section className="rounded-2xl border border-border/50 bg-card/75 p-5 shadow-2xl shadow-black/35 backdrop-blur-md md:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Tableau de bord
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                statusTone
              )}
            >
              {isConnected || isSimulator ? (
                <Radio className="size-3.5 animate-pulse" aria-hidden />
              ) : (
                <Unplug className="size-3.5" aria-hidden />
              )}
              {statusLabel}
            </span>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            {isConnected ? (
              <>
                Source :{" "}
                <span className="font-medium text-foreground">
                  {device?.name ?? "Appareil"}
                </span>
              </>
            ) : (
              "Connectez un home trainer ou activez le simulateur pour voir les données en direct."
            )}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              disabled={isScanning || isSimulator}
              onClick={() => {
                resetError();
                void scanAndConnect();
              }}
            >
              {isScanning ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Connexion…
                </>
              ) : (
                <>
                  <Bluetooth className="size-4" />
                  Connecter le Home Trainer
                </>
              )}
            </Button>
            <Button
              type="button"
              size="lg"
              variant={isSimulator ? "secondary" : "outline"}
              className={cn(
                "w-full sm:w-auto",
                isSimulator && "ring-2 ring-amber-500/40"
              )}
              disabled={isScanning}
              onClick={() => {
                resetError();
                void setSimulatorMode(!isSimulator);
              }}
            >
              <Activity className="size-4" />
              {isSimulator ? "Simulateur actif" : "Activer le simulateur"}
            </Button>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="grid w-full grid-cols-2 gap-4 rounded-xl border border-border/40 bg-background/50 p-4 sm:max-w-lg lg:w-auto">
          <LiveMetric label="Puissance" value={power} unit="W" />
          <LiveMetric label="Cadence" value={cadence} unit="rpm" />
        </div>
      </div>

      {isSimulator ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="size-3.5 text-amber-400" aria-hidden />
          Flux simulé temps réel (~4 Hz) — prêt pour le pilotage ERG des séances.
        </p>
      ) : null}
    </section>
  );
}
