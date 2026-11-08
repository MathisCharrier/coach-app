export type IndoorBikeMetrics = {
  power: number | null;
  cadence: number | null;
  /** Average speed from FTMS when present (km/h). */
  speedKmH: number | null;
};

const FLAG_INSTANTANEOUS_CADENCE = 1 << 2;
const FLAG_INSTANTANEOUS_POWER = 1 << 4;

/**
 * Parse FTMS Indoor Bike Data (0x2AD2) notifications.
 * @see Bluetooth SIG Fitness Machine Service specification.
 */
export function parseIndoorBikeData(buffer: ArrayBufferLike): IndoorBikeMetrics {
  const view = new DataView(buffer);

  if (view.byteLength < 2) {
    return { power: null, cadence: null, speedKmH: null };
  }

  const flags = view.getUint16(0, true);
  let offset = 2;

  const readUint16 = (): number => {
    if (offset + 2 > view.byteLength) {
      throw new RangeError("Indoor Bike Data incomplet.");
    }
    const value = view.getUint16(offset, true);
    offset += 2;
    return value;
  };

  const readInt16 = (): number => {
    if (offset + 2 > view.byteLength) {
      throw new RangeError("Indoor Bike Data incomplet.");
    }
    const value = view.getInt16(offset, true);
    offset += 2;
    return value;
  };

  let cadence: number | null = null;
  let power: number | null = null;
  let speedKmH: number | null = null;

  try {
    if (flags & (1 << 1)) {
      speedKmH = Math.round((readUint16() / 100) * 10) / 10;
    }

    if (flags & FLAG_INSTANTANEOUS_CADENCE) {
      cadence = readUint16() / 2;
    }

    if (flags & (1 << 3)) {
      readUint16();
    }

    if (flags & FLAG_INSTANTANEOUS_POWER) {
      power = readInt16();
    }
  } catch {
    return { power, cadence, speedKmH };
  }

  return { power, cadence, speedKmH };
}
