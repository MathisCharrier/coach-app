import { Suspense } from "react";

import { ActivityDetail } from "@/components/activity/activity-detail";

export default function ActivityPage() {
  return (
    <Suspense fallback={<div className="min-h-full flex-1 bg-slate-50" />}>
      <ActivityDetail />
    </Suspense>
  );
}
