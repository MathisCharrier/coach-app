export type GarminActivitySummary = {
  id: number;
  /** activityName */
  title: string;
  activityName?: string;
  /** activityType.typeKey */
  activityType?: string;
  date: string;
  durationSeconds: number;
  durationLabel: string;
  /** Mètres, champ `distance`. */
  distance?: number | null;
  /** m/s, champ `averageSpeed`. */
  averageSpeed?: number | null;
  /** Mètres, champ `elevationGain`. */
  elevationGain?: number | null;
  /** Champ `averageHR`. */
  averageHR?: number | null;
  /** Watts, champ `avgPower`. */
  averagePower?: number | null;
  /** Champ `steps`, absent sur la plupart des sorties vélo. */
  steps?: number | null;
  averagePowerWatts: number | null;
  tss: number | null;
  /** Présent quand Garmin indique un tracé GPS. */
  hasPolyline?: boolean;
};

export type RoutePoint = [number, number];

export type GarminSyncResponse = {
  activities: GarminActivitySummary[];
  count: number;
};
