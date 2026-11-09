/**
 * Compatibilité : le stockage cookie a été remplacé par Supabase
 * (`garmin_sessions`). Réexporte l'API de session-store.
 */
export {
  clearGarminSessionForUser,
  clearGarminSessionForUser as clearGarminSessionCookie,
  getGarminSessionForUser,
  saveGarminSessionForUser,
  type GarminSessionRecord,
} from "@/lib/garmin/session-store";
