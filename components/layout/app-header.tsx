"use client";

import { Activity, ArrowLeft, CalendarDays, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CalendarView } from "@/components/CalendarView";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

type AppHeaderProps = {
  subtitle?: string;
  backHome?: boolean;
};

export function AppHeader({
  subtitle = "Coach multi-sports",
  backHome = false,
}: AppHeaderProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!showCalendar) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowCalendar(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showCalendar]);

  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <Link href="/" className="inline-flex items-center gap-2">
          <Activity className="size-4 text-orange-500" aria-hidden />
          <span className="text-sm font-medium tracking-tight text-zinc-900">
            Coach
          </span>
        </Link>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>

      <nav className="flex items-center gap-2">
        {backHome ? (
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "rounded-full border-gray-200 bg-white text-zinc-700 shadow-sm hover:bg-gray-50"
            )}
          >
            <ArrowLeft className="size-4" />
            Retour à l&apos;accueil
          </Link>
        ) : null}
        <button
          type="button"
          aria-pressed={showCalendar}
          onClick={() => setShowCalendar(true)}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-full border-gray-200 bg-white text-zinc-700 shadow-sm hover:bg-gray-50"
          )}
        >
          <CalendarDays className="size-4 text-orange-500" />
          Calendrier
        </button>
        <Link
          href="/profile"
          className={cn(
            buttonVariants({ size: "sm" }),
            "rounded-full bg-orange-600 font-medium text-white shadow-sm hover:bg-orange-700"
          )}
        >
          <UserRound className="size-4" />
          Profil
        </Link>
      </nav>

      {showCalendar ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 p-4 backdrop-blur-sm"
          onClick={() => setShowCalendar(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Calendrier"
            className="flex max-h-[min(90vh,52rem)] w-full max-w-5xl flex-col gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                type="button"
                aria-label="Fermer le calendrier"
                onClick={() => setShowCalendar(false)}
                className="rounded-full border border-gray-200 bg-white p-2 text-zinc-700 shadow-sm"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto">
              <CalendarView />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
