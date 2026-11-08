"use client";

import { useTrainerStore } from "@/store/useTrainerStore";

/**
 * Accès déclaratif au store FTMS (Web Bluetooth + simulateur).
 */
export function useTrainerBluetooth() {
  const isSimulator = useTrainerStore((state) => state.isSimulator);
  const isConnected = useTrainerStore((state) => state.isConnected);
  const isScanning = useTrainerStore((state) => state.isScanning);
  const device = useTrainerStore((state) => state.device);
  const power = useTrainerStore((state) => state.power);
  const cadence = useTrainerStore((state) => state.cadence);
  const speedKmH = useTrainerStore((state) => state.speedKmH);
  const heartRate = useTrainerStore((state) => state.heartRate);
  const targetPower = useTrainerStore((state) => state.targetPower);
  const error = useTrainerStore((state) => state.error);

  const toggleSimulator = useTrainerStore((state) => state.toggleSimulator);
  const setSimulatorMode = useTrainerStore((state) => state.setSimulatorMode);
  const scanAndConnect = useTrainerStore((state) => state.scanAndConnect);
  const connectDevice = useTrainerStore((state) => state.connectDevice);
  const disconnectDevice = useTrainerStore((state) => state.disconnectDevice);
  const setErgTargetPower = useTrainerStore((state) => state.setErgTargetPower);
  const resetError = useTrainerStore((state) => state.resetError);

  return {
    isSimulator,
    isConnected,
    isScanning,
    isConnecting: isScanning,
    device,
    power,
    cadence,
    speedKmH,
    heartRate,
    targetPower,
    error,
    toggleSimulator,
    setSimulatorMode,
    scanAndConnect,
    connectDevice,
    disconnectDevice,
    setErgTargetPower,
    resetError,
  };
}
