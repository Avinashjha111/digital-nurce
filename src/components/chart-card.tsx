"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Semantic status hues (matches globals.css --status-*) as literal hex,
// since recharts renders to SVG fills outside Tailwind's reach.
const seriesColor: Record<string, string> = {
  success: "#16A34A",
  warning: "#F59E0B",
  info: "#2563EB",
  action: "#F97316",
  danger: "#DC2626",
  neutral: "#94A3B8",
};

export type ChartSeries = { key: string; label: string; tone: keyof typeof seriesColor };

// dashboard.md's "keep it simple, operational -- not decorative" chart:
// one small bar chart per card, at most a handful of series.
export function ChartCard({
  title,
  data,
  series,
}: {
  title: string;
  data: Record<string, string | number>[];
  series: ChartSeries[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-56 pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #E5E7EB",
                background: "#FFFFFF",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={seriesColor[s.tone]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
