export type SimulatedMetrics = {
  power: number;
  cadence: number;
  heartRate: number;
  speedKmH: number;
};

type SimulatorUpdate = (metrics: SimulatedMetrics) => void;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Estimation vituelle indoor (km/h) à partir de la puissance et de la cadence. */
export function estimateIndoorSpeedKmH(power: number, cadence: number): number {
  const fromPower = 8.8 + power / 12.5;
  const fromCadence = cadence * 0.12;
  return Math.round((fromPower * 0.65 + fromCadence * 0.35) * 10) / 10;
}

export class TrainerSimulator {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private targetPower = 200;
  private power = 0;
  private cadence = 88;
  private heartRate = 132;
  private speedKmH = 0;
  private phase = 0;
  private onUpdate: SimulatorUpdate;

  constructor(onUpdate: SimulatorUpdate) {
    this.onUpdate = onUpdate;
  }

  start(targetPower?: number): void {
    if (targetPower !== undefined) {
      this.targetPower = targetPower;
    }

    this.power = Math.max(50, this.targetPower * 0.55);
    this.cadence = 85;
    this.speedKmH = estimateIndoorSpeedKmH(this.power, this.cadence);
    this.phase = 0;
    this.stop();

    this.intervalId = setInterval(() => {
      this.phase += 0.35;
      const wave = Math.sin(this.phase) * 12;

      const powerNoise = (Math.random() - 0.5) * 14;
      const driftToTarget = (this.targetPower - this.power) * 0.18;
      this.power = clamp(
        Math.round(this.power + driftToTarget + powerNoise + wave * 0.3),
        0,
        this.targetPower + 40
      );

      const cadenceNoise = (Math.random() - 0.5) * 3;
      const cadenceTarget = 78 + this.power / 7 + Math.cos(this.phase * 0.7) * 4;
      this.cadence = clamp(
        Math.round(
          this.cadence + (cadenceTarget - this.cadence) * 0.22 + cadenceNoise
        ),
        55,
        125
      );

      const hrTarget = 115 + this.power / 3.8;
      this.heartRate = clamp(
        Math.round(this.heartRate + (hrTarget - this.heartRate) * 0.12),
        90,
        190
      );

      this.speedKmH = estimateIndoorSpeedKmH(this.power, this.cadence);

      this.emit();
    }, 250);
  }

  setTargetPower(watts: number): void {
    this.targetPower = clamp(Math.round(watts), 0, 1_200);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

  }

  private emit(): void {
    this.onUpdate({
      power: this.power,
      cadence: this.cadence,
      heartRate: this.heartRate,
      speedKmH: this.speedKmH,
    });
  }
}
