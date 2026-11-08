"use client";

import { create } from "zustand";

import { getFtmsClient } from "@/lib/bluetooth/ftms-client";
import {
  estimateIndoorSpeedKmH,
  TrainerSimulator,
} from "@/lib/bluetooth/trainer-simulator";

export type TrainerDeviceInfo = {
  id: string;
  name: string;
};

type TrainerMetricsPatch = {
  power?: number;
  cadence?: number;
  heartRate?: number | null;
  speedKmH?: number;
};

type TrainerState = {
  isSimulator: boolean;
  isConnected: boolean;
  isScanning: boolean;
  device: TrainerDeviceInfo | null;
  power: number;
  cadence: number;
  speedKmH: number;
  heartRate: number | null;
  targetPower: number | null;
  error: string | null;

  toggleSimulator: () => Promise<void>;
  setSimulatorMode: (enabled: boolean) => Promise<void>;
  scanAndConnect: () => Promise<void>;
  connectDevice: () => Promise<void>;
  disconnectDevice: () => Promise<void>;
  setErgTargetPower: (watts: number) => Promise<void>;
  resetError: () => void;
};

let simulator: TrainerSimulator | null = null;
let bluetoothBound = false;

function ensureSimulator(
  apply: (metrics: {
    power: number;
    cadence: number;
    heartRate: number;
    speedKmH: number;
  }) => void
): TrainerSimulator {
  if (!simulator) {
    simulator = new TrainerSimulator(apply);
  }
  return simulator;
}

function bindBluetoothClient(
  set: (
    partial:
      | Partial<TrainerState>
      | ((state: TrainerState) => Partial<TrainerState>)
  ) => void
): void {
  if (bluetoothBound) {
    return;
  }

  const client = getFtmsClient();

  client.setMetricsListener((metrics) => {
    set((state) => {
      const power = metrics.power ?? state.power;
      const cadence = metrics.cadence ?? state.cadence;
      const speedKmH =
        metrics.speedKmH ??
        (power > 0 || cadence > 0
          ? estimateIndoorSpeedKmH(power, cadence)
          : state.speedKmH);

      return {
        power,
        cadence,
        speedKmH,
      };
    });
  });

  client.setDisconnectListener(() => {
    set({
      isConnected: false,
      isScanning: false,
      device: null,
      power: 0,
      cadence: 0,
      speedKmH: 0,
      heartRate: null,
    });
  });

  bluetoothBound = true;
}

function resetLiveMetrics(): TrainerMetricsPatch {
  return {
    power: 0,
    cadence: 0,
    speedKmH: 0,
    heartRate: null,
  };
}

export const useTrainerStore = create<TrainerState>((set, get) => {
  const applySimulatorMetrics = (metrics: {
    power: number;
    cadence: number;
    heartRate: number;
    speedKmH: number;
  }) => {
    set({
      power: metrics.power,
      cadence: metrics.cadence,
      heartRate: metrics.heartRate,
      speedKmH: metrics.speedKmH,
    });
  };

  return {
    isSimulator: false,
    isConnected: false,
    isScanning: false,
    device: null,
    power: 0,
    cadence: 0,
    speedKmH: 0,
    heartRate: null,
    targetPower: null,
    error: null,

    resetError: () => set({ error: null }),

    toggleSimulator: async () => {
      const next = !get().isSimulator;
      await get().setSimulatorMode(next);
    },

    setSimulatorMode: async (enabled) => {
      const state = get();

      if (enabled) {
        if (state.isConnected && !state.isSimulator) {
          await get().disconnectDevice();
        }

        simulator?.stop();
        const sim = ensureSimulator(applySimulatorMetrics);
        sim.start(state.targetPower ?? 220);

        set({
          isSimulator: true,
          isConnected: true,
          isScanning: false,
          device: { id: "simulator", name: "Simulateur FTMS" },
          error: null,
        });
        return;
      }

      simulator?.stop();
      set({
        isSimulator: false,
        isConnected: false,
        device: null,
        ...resetLiveMetrics(),
      });
    },

    scanAndConnect: async () => {
      if (get().isScanning) {
        return;
      }

      bindBluetoothClient(set);
      simulator?.stop();

      set({
        isSimulator: false,
        isScanning: true,
        error: null,
      });

      try {
        const device = await getFtmsClient().scanAndConnect();

        set({
          isScanning: false,
          isConnected: true,
          device,
          heartRate: null,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Connexion Bluetooth impossible.";

        if (message.toLowerCase().includes("cancel")) {
          set({ isScanning: false, error: null });
          return;
        }

        set({
          isScanning: false,
          isConnected: false,
          device: null,
          error: message,
        });
      }
    },

    connectDevice: async () => {
      await get().scanAndConnect();
    },

    disconnectDevice: async () => {
      if (get().isSimulator) {
        simulator?.stop();
        set({
          isConnected: false,
          device: null,
          isSimulator: false,
          ...resetLiveMetrics(),
        });
        return;
      }

      try {
        await getFtmsClient().disconnect();
      } catch (error) {
        console.error("[trainer] disconnect", error);
      }

      set({
        isConnected: false,
        isScanning: false,
        device: null,
        ...resetLiveMetrics(),
      });
    },

    setErgTargetPower: async (watts) => {
      const clamped = Math.max(0, Math.min(1_200, Math.round(watts)));
      set({ targetPower: clamped, error: null });

      const state = get();

      try {
        if (state.isSimulator) {
          ensureSimulator(applySimulatorMetrics).setTargetPower(clamped);
          return;
        }

        if (!state.isConnected) {
          throw new Error("Aucun home trainer connecté.");
        }

        await getFtmsClient().setTargetPower(clamped);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de régler la puissance cible.";

        set({ error: message });
        throw error;
      }
    },
  };
});
