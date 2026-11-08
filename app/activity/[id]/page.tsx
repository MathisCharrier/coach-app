import { Suspense } from "react";

import { ActivityDetail } from "@/components/activity/activity-detail";

export default function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-full flex-1 bg-zinc-950" />}>
      <ActivityDetail params={params} />
    </Suspense>
  );
}
