import { Area, AreaChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../system/Card";

const STATUS_COLORS: Record<string, string> = {
  Delivered: "#22c55e",
  Cancelled: "#ef4444",
  RTO: "#f59e0b",
};

const STATUS_BADGES: Record<string, string> = {
  Delivered: "bg-success/10 text-success",
  Cancelled: "bg-error/10 text-error",
  RTO: "bg-warning/10 text-warning",
};

export default function ReturnCancelStats({
  data,
  className = "",
  trendData = [],
}: {
  data: { Delivered?: number; Cancelled?: number; RTO?: number };
  className?: string;
  trendData?: { date: string; count: number }[];
}) {
  const chartData = Object.entries(data).map(([status, value]) => ({
    name: status,
    value,
  }));

  const total = chartData.reduce((sum, item) => sum + Number(item.value || 0), 0);

  const formattedTrend = trendData.map((point) => ({
    ...point,
    label: new Date(point.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));

  if (formattedTrend.length > 0) {
    return (
      <Card className={`h-full ${className}`.trim()} title="Returns / Cancellations Trend" description="Last 7 days of return and cancellation activity" padding="p-6">
        <div className="flex h-full min-h-[360px] flex-col">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-3xl font-bold text-text-primary">{total.toLocaleString("en-IN")}</p>
              <p className="app-body-normal text-text-muted">Total returns and cancellations</p>
            </div>
            <div className="rounded-2xl bg-error-50 px-4 py-2 text-right">
              <p className="text-sm font-medium text-error-700">Live signal</p>
              <p className="text-lg font-semibold text-error-900">{formattedTrend.length} points</p>
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTrend} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="returnsTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#ef4444"
                  strokeWidth={3}
                  fill="url(#returnsTrendGradient)"
                  isAnimationActive
                  animationBegin={140}
                  animationDuration={4600}
                  animationEasing="ease-in-out"
                  dot={false}
                  activeDot={{ r: 4, fill: "#b91c1c", stroke: "#ffffff", strokeWidth: 1 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card className={`h-full ${className}`.trim()} title="Returns & Cancellations" description="Breakdown by order outcome" padding="p-6">
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-gray-25 text-center">
          <div>
            <p className="app-body-large text-text-primary">No return or cancellation activity yet</p>
            <p className="mt-1 app-body-normal text-text-muted">This section will populate when order outcomes are available.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`h-full ${className}`.trim()} title="Returns & Cancellations" description="Breakdown by order outcome" padding="p-6">
      <ResponsiveContainer width="100%" height={215}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={64}
            dataKey="value"
            nameKey="name"
            isAnimationActive
            animationBegin={140}
            animationDuration={4200}
            animationEasing="ease-in-out"
            label={({ name, percent }) => `${name}: ${Number(((percent ?? 0) * 100).toFixed(0))}%`}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#465fff"} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {chartData.map((entry) => (
          <span
            key={entry.name}
            className={`rounded-full px-3 py-1 app-label ${STATUS_BADGES[entry.name] || "bg-slate-100 text-text-secondary"}`}
          >
            {entry.name}: {entry.value} ({((Number(entry.value || 0) / total) * 100).toFixed(1)}%)
          </span>
        ))}
      </div>
    </Card>
  );
}