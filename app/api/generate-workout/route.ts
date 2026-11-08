import { generateStructuredWorkout } from "@/lib/workout/generate-structured-workout";
import { NextResponse } from "next/server";
import { z } from "zod";

const generateWorkoutRequestSchema = z.object({
  fatigueLevel: z
    .string()
    .trim()
    .min(1, "Le niveau de fatigue est requis."),
  ftp: z
    .number()
    .finite("La FTP doit être un nombre valide.")
    .positive("La FTP doit être supérieure à 0.")
    .max(600, "La FTP semble trop élevée (max 600 W)."),
});

const workoutResponseSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  intervals: z
    .array(
      z.object({
        duration: z
          .number()
          .int("duration doit être un entier (secondes).")
          .positive("duration doit être supérieure à 0."),
        targetPower: z
          .number()
          .int("targetPower doit être un entier (watts).")
          .nonnegative("targetPower ne peut pas être négatif."),
      })
    )
    .min(1, "La séance doit contenir au moins un intervalle."),
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide." },
        { status: 400 }
      );
    }

    const parsedRequest = generateWorkoutRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: "Paramètres invalides.",
          details: z.treeifyError(parsedRequest.error),
        },
        { status: 400 }
      );
    }

    const { fatigueLevel, ftp } = parsedRequest.data;
    const workout = generateStructuredWorkout(ftp, fatigueLevel);

    const parsedWorkout = workoutResponseSchema.safeParse(workout);
    if (!parsedWorkout.success) {
      return NextResponse.json(
        {
          error: "La séance générée est incohérente.",
          details: z.treeifyError(parsedWorkout.error),
        },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedWorkout.data);
  } catch (error) {
    console.error("[generate-workout]", error);

    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
