export type GarminActivitySummary = {
  id: number;
  title: string;
  date: string;
  durationSeconds: number;
  durationLabel: string;
  averagePowerWatts: number | null;
  tss: number | null;
};

export type GarminSyncResponse = {
  activities: GarminActivitySummary[];
  count: number;
};
