"use client";

import { Gauge, HeartPulse } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTrainerStore } from "@/store/useTrainerStore";

function MetricRow({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden />
        {label}
      </div>
      <p className="font-mono text-lg font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {unit}
        </span>
      </p>
    </div>
  );
}

export function TrainingSecondaryMetrics() {
  const isConnected = useTrainerStore((s) => s.isConnected);
  const isSimulator = useTrainerStore((s) => s.isSimulator);
  const speedKmH = useTrainerStore((s) => s.speedKmH);
  const heartRate = useTrainerStore((s) => s.heartRate);
  const targetPower = useTrainerStore((s) => s.targetPower);

  if (!isConnected) {
    return null;
  }

  return (
    <Card className="rounded-3xl border border-zinc-800 bg-zinc-900 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Métriques complémentaires
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <MetricRow
          icon={Gauge}
          label="Vitesse"
          value={speedKmH.toFixed(1)}
          unit="km/h"
        />
        {(isSimulator || heartRate !== null) && (
          <MetricRow
            icon={HeartPulse}
            label="Fréquence cardiaque"
            value={String(heartRate ?? "—")}
            unit="bpm"
          />
        )}
        <MetricRow
          icon={Gauge}
          label="Cible ERG"
          value={targetPower !== null ? String(targetPower) : "—"}
          unit="W"
        />
      </CardContent>
    </Card>
  );
}
