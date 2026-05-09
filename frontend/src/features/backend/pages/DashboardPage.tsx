import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api";
import Card from "../../../components/system/Card";
import PageHeader from "../../../components/system/PageHeader";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type OverviewPoint = {
  date: string;
  count: number;
};

type BifurcationItem = {
  status: string;
  label: string;
  count: number;
  color?: string;
};

type Overview = {
  totalOrdersReceived?: number;
  pendingUpdateCount?: number;
  bifurcation?: BifurcationItem[];
  chartData?: OverviewPoint[];
};

type ApiResponse = { data?: Overview };

const numberFormat = new Intl.NumberFormat("en-IN");

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<ApiResponse>("/orders/dashboard-overview?range=7days")
      .then((res) => setOverview(res.data || {}))
      .catch((fetchError: Error) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    return (overview.chartData ?? []).map((point) => {
      const parsed = new Date(point.date);
      const label = `${parsed.getDate()} ${parsed.toLocaleString("default", { month: "short" })}`;
      return {
        ...point,
        label,
      };
    });
  }, [overview.chartData]);

  const bifurcation = overview.bifurcation ?? [];
  const totalReceived = overview.totalOrdersReceived ?? 0;
  const pendingCount = overview.pendingUpdateCount ?? 0;
  const deliveredCount = bifurcation.find((entry) => entry.status === "delivered")?.count ?? 0;
  const cancelledCount = bifurcation.find((entry) => entry.status === "cancelled")?.count ?? 0;

  const pendingRatio = totalReceived > 0 ? Math.round((pendingCount / totalReceived) * 100) : 0;
  const deliveredRatio = totalReceived > 0 ? Math.round((deliveredCount / totalReceived) * 100) : 0;

  const cards = [
    {
      label: "Total Orders Received",
      value: numberFormat.format(totalReceived),
      accent: "bg-blue-light-100 text-blue-light-800",
      meta: "All unique order references",
    },
    {
      label: "Pending Updates",
      value: numberFormat.format(pendingCount),
      accent: "bg-warning-100 text-warning-800",
      meta: `${pendingRatio}% of total pipeline`,
    },
    {
      label: "Delivered",
      value: numberFormat.format(deliveredCount),
      accent: "bg-success-100 text-success-800",
      meta: `${deliveredRatio}% delivery conversion`,
    },
    {
      label: "Cancelled",
      value: numberFormat.format(cancelledCount),
      accent: "bg-error-100 text-error-800",
      meta: "Operational risk tracker",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Enterprise command center for orders and fulfillment performance." />
      {loading ? (
        <Card title="Loading dashboard" description="Fetching the latest order stats." padding="p-6">
          <div className="flex min-h-[180px] items-center justify-center app-body-normal text-text-muted">
            Loading dashboard...
          </div>
        </Card>
      ) : error ? (
        <Card title="Dashboard unavailable" description="Could not load the stats feed." padding="p-6">
          <div className="flex min-h-[180px] items-center justify-center app-body-normal text-error">
            {error}
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <Card key={card.label} padding="p-6" className="relative overflow-hidden">
                <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-brand-100/60" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="app-label">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold leading-none text-gray-900">{card.value}</p>
                    <p className="mt-2 text-sm text-gray-500">{card.meta}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${card.accent}`}>
                    Live
                  </span>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card
              title="Orders Trend"
              description="Daily unique order flow for the last 7 days"
              padding="p-6"
              className="xl:col-span-2"
            >
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ordersTrendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                    <Tooltip
                      cursor={{ stroke: "#BFDBFE", strokeWidth: 1 }}
                      formatter={(value) => [numberFormat.format(Number(value)), "Orders"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#1D4ED8"
                      strokeWidth={3}
                      fill="url(#ordersTrendGradient)"
                      dot={false}
                      activeDot={{ r: 4, stroke: "#FFFFFF", strokeWidth: 2, fill: "#1D4ED8" }}
                      isAnimationActive
                      animationEasing="ease-in-out"
                      animationBegin={140}
                      animationDuration={4600}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Order Status Mix" description="Distribution by latest business stage" padding="p-6">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bifurcation}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={106}
                      paddingAngle={2}
                      isAnimationActive
                      animationBegin={140}
                      animationDuration={4200}
                      animationEasing="ease-in-out"
                    >
                      {bifurcation.map((segment) => (
                        <Cell key={segment.status} fill={segment.color || "#94A3B8"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [numberFormat.format(Number(value)), "Orders"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {bifurcation.map((segment) => (
                  <div key={segment.status} className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color || "#94A3B8" }} />
                    <span className="text-gray-600">{segment.label}</span>
                    <span className="ml-auto font-semibold text-gray-900">{numberFormat.format(segment.count)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
