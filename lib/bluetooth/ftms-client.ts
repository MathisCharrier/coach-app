import {
  encodeRequestControl,
  encodeSetTargetPower,
  encodeStartOrResume,
} from "@/lib/bluetooth/ftms/control-point";
import { parseIndoorBikeData } from "@/lib/bluetooth/ftms/parse-indoor-bike-data";
import {
  FITNESS_MACHINE_CONTROL_POINT_STRING,
  FITNESS_MACHINE_CONTROL_POINT_UUID,
  FTMS_SERVICE_STRING,
  FTMS_SERVICE_UUID,
  INDOOR_BIKE_DATA_STRING,
  INDOOR_BIKE_DATA_UUID,
  toBluetoothUuid,
} from "@/lib/bluetooth/ftms/uuids";

export type FtmsMetrics = {
  power: number | null;
  cadence: number | null;
  speedKmH: number | null;
};

export type FtmsConnectionInfo = {
  id: string;
  name: string;
};

export type FtmsMetricsListener = (metrics: FtmsMetrics) => void;
export type FtmsDisconnectListener = () => void;

function isWebBluetoothAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.bluetooth !== "undefined" &&
    typeof navigator.bluetooth.requestDevice === "function"
  );
}

export class FtmsClient {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private controlPoint: BluetoothRemoteGATTCharacteristic | null = null;
  private hasControl = false;
  private metricsListener: FtmsMetricsListener | null = null;
  private disconnectListener: FtmsDisconnectListener | null = null;

  private handleIndoorBikeData = (event: Event): void => {
    const characteristic = event.currentTarget;
    if (!characteristic || !("value" in characteristic)) {
      return;
    }

    const value = (characteristic as BluetoothRemoteGATTCharacteristic).value;
    if (!value) {
      return;
    }

    const packet = new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength
    );
    const metrics = parseIndoorBikeData(packet.buffer);
    this.metricsListener?.(metrics);
  };

  private handleDeviceDisconnected = (): void => {
    this.cleanupGattState();
    this.disconnectListener?.();
  };

  setMetricsListener(listener: FtmsMetricsListener | null): void {
    this.metricsListener = listener;
  }

  setDisconnectListener(listener: FtmsDisconnectListener | null): void {
    this.disconnectListener = listener;
  }

  /** Ouvre le sélecteur Bluetooth pour un périphérique FTMS (service 0x1826). */
  async scanAndConnect(): Promise<FtmsConnectionInfo> {
    if (!isWebBluetoothAvailable()) {
      throw new Error(
        "Web Bluetooth indisponible. Utilisez Chrome/Edge en HTTPS ou localhost."
      );
    }

    const ftmsUuid = toBluetoothUuid(FTMS_SERVICE_UUID);

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [FTMS_SERVICE_STRING] }, { services: [ftmsUuid] }],
      optionalServices: [FTMS_SERVICE_STRING, ftmsUuid],
    });

    this.device = device;
    device.addEventListener(
      "gattserverdisconnected",
      this.handleDeviceDisconnected
    );

    const server = device.gatt;
    if (!server) {
      throw new Error("L'appareil sélectionné n'expose pas GATT.");
    }

    const connected = await server.connect();
    this.server = connected;

    const service = await this.getFtmsService(connected);
    const indoorBikeData = await this.getCharacteristic(
      service,
      INDOOR_BIKE_DATA_STRING,
      INDOOR_BIKE_DATA_UUID
    );

    await indoorBikeData.startNotifications();
    indoorBikeData.addEventListener(
      "characteristicvaluechanged",
      this.handleIndoorBikeData
    );

    const controlPoint = await this.getCharacteristic(
      service,
      FITNESS_MACHINE_CONTROL_POINT_STRING,
      FITNESS_MACHINE_CONTROL_POINT_UUID
    );
    this.controlPoint = controlPoint;

    await this.requestControl();

    return {
      id: device.id,
      name: device.name ?? "Home trainer",
    };
  }

  /** @deprecated Utilisez scanAndConnect(). */
  async connect(): Promise<FtmsConnectionInfo> {
    return this.scanAndConnect();
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.handleDeviceDisconnected();
  }

  async setTargetPower(watts: number): Promise<void> {
    if (!this.controlPoint) {
      throw new Error("Point de contrôle FTMS non disponible.");
    }

    if (!this.hasControl) {
      await this.requestControl();
    }

    await this.writeControlPoint(encodeSetTargetPower(watts));
    await this.writeControlPoint(encodeStartOrResume());
  }

  private async requestControl(): Promise<void> {
    if (!this.controlPoint) {
      throw new Error("Point de contrôle FTMS non disponible.");
    }

    await this.writeControlPoint(encodeRequestControl());
    this.hasControl = true;
  }

  private async writeControlPoint(value: ArrayBuffer | Uint8Array): Promise<void> {
    if (!this.controlPoint) {
      throw new Error("Point de contrôle FTMS non disponible.");
    }

    const source = value instanceof Uint8Array ? value : new Uint8Array(value);
    const payload = new Uint8Array(source);
    await this.controlPoint.writeValue(payload);
  }

  private async getFtmsService(
    server: BluetoothRemoteGATTServer
  ): Promise<BluetoothRemoteGATTService> {
    try {
      return await server.getPrimaryService(FTMS_SERVICE_STRING);
    } catch {
      return await server.getPrimaryService(toBluetoothUuid(FTMS_SERVICE_UUID));
    }
  }

  private async getCharacteristic(
    service: BluetoothRemoteGATTService,
    name: string,
    shortUuid: number
  ): Promise<BluetoothRemoteGATTCharacteristic> {
    try {
      return await service.getCharacteristic(name);
    } catch {
      return await service.getCharacteristic(toBluetoothUuid(shortUuid));
    }
  }

  private cleanupGattState(): void {
    this.server = null;
    this.controlPoint = null;
    this.hasControl = false;
    this.device = null;
  }
}

let ftmsClientSingleton: FtmsClient | null = null;

export function getFtmsClient(): FtmsClient {
  if (!ftmsClientSingleton) {
    ftmsClientSingleton = new FtmsClient();
  }
  return ftmsClientSingleton;
}
