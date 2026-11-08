import { GarminConnectForm } from "@/components/garmin/garmin-connect-form";
import { DashboardBackground } from "@/components/layout/dashboard-background";
import { ProfileBackLink } from "@/components/profile/profile-back-link";

export default function ProfilePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950">
      <DashboardBackground />

      <div className="relative z-10 mx-auto w-full max-w-xl flex-1 p-4 md:p-8">
        <ProfileBackLink />

        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
          <p className="text-sm text-muted-foreground">
            Connecte tes services et gère la synchronisation de tes données.
          </p>
        </div>

        <GarminConnectForm />
      </div>
    </div>
  );
}
