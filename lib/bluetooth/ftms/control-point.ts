/** FTMS Fitness Machine Control Point opcodes */
export const FTMS_OPCODE = {
  REQUEST_CONTROL: 0x00,
  RESET: 0x01,
  SET_TARGET_POWER: 0x05,
  START_OR_RESUME: 0x07,
  STOP_OR_PAUSE: 0x08,
} as const;

/** Target power is encoded in 0.1 W resolution (sint16). */
export function encodeSetTargetPower(watts: number): ArrayBuffer {
  const clamped = Math.max(0, Math.min(4_000, Math.round(watts)));
  const tenths = clamped * 10;
  const buffer = new ArrayBuffer(3);
  const view = new DataView(buffer);
  view.setUint8(0, FTMS_OPCODE.SET_TARGET_POWER);
  view.setInt16(1, tenths, true);
  return buffer;
}

export function encodeRequestControl(): Uint8Array {
  return Uint8Array.from([FTMS_OPCODE.REQUEST_CONTROL]);
}

export function encodeStartOrResume(): Uint8Array {
  return Uint8Array.from([FTMS_OPCODE.START_OR_RESUME]);
}
