"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Props {
  data: Array<{ month: string; revenue: number }>;
  formatMoney: (n: number) => string;
}

export function AdminRevenueChart({ data, formatMoney }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
        <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
        <YAxis stroke="#9ca3af" fontSize={11} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid #1f2937",
            borderRadius: 8,
            fontSize: 12,
            color: "#fff",
          }}
          labelStyle={{ color: "#d1d5db" }}
          formatter={(v: unknown) => formatMoney(Number(v) || 0)}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#34d399"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: "#34d399" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
