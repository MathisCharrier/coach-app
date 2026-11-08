import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.12_250)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,oklch(0.28_0.14_25)_0%,transparent_50%)] opacity-80"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.12_0_0)_85%)]"
      />
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">Chargement…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
