"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: Array<{ date: string; newProducers: number; cancellations: number }>;
}

function formatDateLabel(d: string) {
  const date = new Date(d + "T12:00:00");
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateFull(d: React.ReactNode) {
  if (typeof d !== "string") return "";
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("pt-BR");
}

export function AdminGrowthChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gradProducers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradChurn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          tick={{ fontSize: 11 }}
          tickFormatter={formatDateLabel}
        />
        <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "#1a1a2e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelFormatter={formatDateFull}
        />
        <Area
          type="monotone"
          dataKey="newProducers"
          name="Novos produtores"
          stroke="#3b82f6"
          fill="url(#gradProducers)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="cancellations"
          name="Cancelamentos"
          stroke="#ef4444"
          fill="url(#gradChurn)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
