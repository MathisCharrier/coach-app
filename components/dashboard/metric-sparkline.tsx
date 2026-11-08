"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

export function MetricSparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <div className="mt-4 h-12 w-full animate-pulse rounded-full bg-gray-100" />;
  }

  const points = values.map((value, index) => ({ index, value }));

  return (
    <div className="mt-4 h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#ea580c"
            fill="#ea580c"
            fillOpacity={0.16}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
