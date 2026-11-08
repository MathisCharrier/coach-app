export type WorkoutInterval = {
  duration: number;
  targetPower: number;
};

export type GeneratedWorkout = {
  title: string;
  description: string;
  intervals: WorkoutInterval[];
};

type FatigueProfile = "very_tired" | "tired" | "normal" | "fresh";

const WARMUP_PERCENTS = [55, 60, 65, 70, 75] as const;

function wattsFromFtp(ftp: number, percent: number): number {
  return Math.round((ftp * percent) / 100 / 5) * 5;
}

export function normalizeFatigueLevel(fatigueLevel: string): FatigueProfile {
  const value = fatigueLevel.trim().toLowerCase();

  if (value.includes("très") || value.includes("tres")) {
    return "very_tired";
  }

  if (value.includes("pleine forme") || value.includes("frais")) {
    return "fresh";
  }

  if (value.includes("fatigu")) {
    return "tired";
  }

  return "normal";
}

function buildProgressiveWarmUp(
  ftp: number,
  options: { endPercent?: number; stepDuration?: number } = {}
): WorkoutInterval[] {
  const endPercent = options.endPercent ?? 75;
  const stepDuration = options.stepDuration ?? 300;

  const percents = WARMUP_PERCENTS.filter((percent) => percent <= endPercent);
  const lastStep = percents[percents.length - 1];

  if (lastStep !== undefined && lastStep < endPercent) {
    percents.push(endPercent as (typeof WARMUP_PERCENTS)[number]);
  }

  return percents.map((percent) => ({
    duration: stepDuration,
    targetPower: wattsFromFtp(ftp, percent),
  }));
}

function buildCoolDown(ftp: number, duration = 600): WorkoutInterval[] {
  return [{ duration, targetPower: wattsFromFtp(ftp, 50) }];
}

function repeatWorkRestCycle(
  ftp: number,
  sets: number,
  work: { duration: number; percent: number },
  rest: { duration: number; percent: number }
): WorkoutInterval[] {
  const intervals: WorkoutInterval[] = [];

  for (let set = 0; set < sets; set += 1) {
    intervals.push({
      duration: work.duration,
      targetPower: wattsFromFtp(ftp, work.percent),
    });
    intervals.push({
      duration: rest.duration,
      targetPower: wattsFromFtp(ftp, rest.percent),
    });
  }

  intervals.pop();
  return intervals;
}

export function generateStructuredWorkout(
  ftp: number,
  fatigueLevel: string
): GeneratedWorkout {
  const profile = normalizeFatigueLevel(fatigueLevel);

  switch (profile) {
    case "very_tired": {
      return {
        title: "Récupération active",
        description:
          "Séance de drainage à basse intensité pour favoriser la circulation et l'absorption de la fatigue, sans stress métabolique supplémentaire.",
        intervals: [
          ...buildProgressiveWarmUp(ftp, { endPercent: 70, stepDuration: 240 }),
          { duration: 1_200, targetPower: wattsFromFtp(ftp, 58) },
          { duration: 600, targetPower: wattsFromFtp(ftp, 52) },
          { duration: 1_200, targetPower: wattsFromFtp(ftp, 60) },
          ...buildCoolDown(ftp),
        ],
      };
    }

    case "tired": {
      return {
        title: "Endurance fondamentale",
        description:
          "Travail aérobie modéré pour consolider les adaptations sans creuser le déficit de récupération. Idéal quand la charge fatigue accumulée.",
        intervals: [
          ...buildProgressiveWarmUp(ftp),
          { duration: 1_500, targetPower: wattsFromFtp(ftp, 65) },
          { duration: 480, targetPower: wattsFromFtp(ftp, 55) },
          { duration: 900, targetPower: wattsFromFtp(ftp, 72) },
          ...buildCoolDown(ftp, 480),
        ],
      };
    }

    case "fresh": {
      return {
        title: "Intervalles au seuil",
        description:
          "Blocs soutenus autour du seuil lactique pour améliorer la puissance critique et la tolérance à l'effort prolongé à haute intensité.",
        intervals: [
          ...buildProgressiveWarmUp(ftp),
          ...repeatWorkRestCycle(ftp, 3, { duration: 600, percent: 97 }, {
            duration: 300,
            percent: 55,
          }),
          { duration: 300, targetPower: wattsFromFtp(ftp, 55) },
          ...repeatWorkRestCycle(ftp, 3, { duration: 120, percent: 105 }, {
            duration: 120,
            percent: 50,
          }),
          ...buildCoolDown(ftp),
        ],
      };
    }

    case "normal":
    default: {
      return {
        title: "Sweet Spot structuré",
        description:
          "Travail au sweet spot (~88-92 % FTP) : le meilleur compromis volume / stimulus pour développer la FTP avec une fatigue maîtrisée.",
        intervals: [
          ...buildProgressiveWarmUp(ftp),
          ...repeatWorkRestCycle(ftp, 3, { duration: 480, percent: 91 }, {
            duration: 240,
            percent: 55,
          }),
          { duration: 600, targetPower: wattsFromFtp(ftp, 88) },
          ...buildCoolDown(ftp),
        ],
      };
    }
  }
}
