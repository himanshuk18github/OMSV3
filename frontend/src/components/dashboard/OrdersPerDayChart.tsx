import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Card from "../system/Card";

export default function OrdersPerDayChart({
  data,
  className = "",
}: {
  data: { date: string; orders: number }[];
  className?: string;
}) {
  if (!data?.some((entry) => Number(entry.orders) > 0)) {
    return (
      <Card title="Orders Per Day" description="Last 7 days of order activity" padding="p-6" className={className}>
        <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-dashed border-border bg-gray-25 text-center">
          <div>
            <p className="app-body-large text-text-primary">No order activity available</p>
            <p className="mt-1 app-body-normal text-text-muted">Activity will show here once orders are placed.</p>
          </div>
        </div>
      </Card>
    );
  }

  // Format date as "2025-06-01" -> "1 Jun"
  const formattedData = data.map((d) => {
    const date = new Date(d.date);
    return {
      ...d,
      label: `${date.getDate()} ${date.toLocaleString("default", { month: "short" })}`,
    };
  });

  return (
    <Card title="Orders Per Day" description="Last 7 days of order activity" padding="p-6" className={className}>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={formattedData} margin={{ top: 10, right: 20, bottom: 4, left: 0 }}>
          {/* No CartesianGrid for blank background */}
          <XAxis dataKey="label" axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="orders"
            stroke="#465fff"
            strokeWidth={3}
            fill="url(#colorOrders)"
            isAnimationActive
            animationBegin={140}
            animationDuration={4800}
            animationEasing="ease-in-out"
            dot={false}
            activeDot={{ r: 4, fill: "#1f3be0", stroke: "#ffffff", strokeWidth: 1 }}
          />
          <defs>
            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#465fff" stopOpacity={0.7} />
              <stop offset="95%" stopColor="#465fff" stopOpacity={0.2} />
            </linearGradient>
          </defs>
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}