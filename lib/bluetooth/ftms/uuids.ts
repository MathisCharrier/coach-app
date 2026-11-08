/** Fitness Machine Service (FTMS) */
export const FTMS_SERVICE_UUID = 0x1826;

/** Indoor Bike Data */
export const INDOOR_BIKE_DATA_UUID = 0x2ad2;

/** Fitness Machine Control Point */
export const FITNESS_MACHINE_CONTROL_POINT_UUID = 0x2ad9;

/** Fitness Machine Status */
export const FITNESS_MACHINE_STATUS_UUID = 0x2ada;

export const FTMS_SERVICE_STRING = "fitness_machine";
export const INDOOR_BIKE_DATA_STRING = "indoor_bike_data";
export const FITNESS_MACHINE_CONTROL_POINT_STRING =
  "fitness_machine_control_point";
export const FITNESS_MACHINE_STATUS_STRING = "fitness_machine_status";

export function toBluetoothUuid(shortUuid: number): string {
  const normalized = shortUuid.toString(16).padStart(4, "0");
  return `0000${normalized}-0000-1000-8000-00805f9b34fb`;
}
