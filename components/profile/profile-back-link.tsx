"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export function ProfileBackLink() {
  return (
    <Link
      href="/"
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "mb-6 -ml-2 text-muted-foreground"
      )}
    >
      <ArrowLeft className="size-4" />
      Retour à l&apos;accueil
    </Link>
  );
}
