import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-950 p-6">
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
