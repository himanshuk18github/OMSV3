import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Card from "../system/Card";

export default function SalesBarChart({
  data,
  className = "",
}: {
  data: { month: string; orders: number }[];
  className?: string;
}) {
  if (!data?.some((entry) => Number(entry.orders) > 0)) {
    return (
      <Card title="Sales Analytics (Last 12 Months)" description="Order count by month" padding="p-6" className={className}>
        <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-dashed border-border bg-gray-25 text-center">
          <div>
            <p className="app-body-large text-text-primary">No sales analytics available</p>
            <p className="mt-1 app-body-normal text-text-muted">Sales trends will appear after orders are recorded.</p>
          </div>
        </div>
      </Card>
    );
  }

  // Format month as e.g. "2025-06" -> "Jun 25"
  const formattedData = data.map((d) => {
    const [year, month] = d.month.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return {
      ...d,
      label: date.toLocaleString("default", { month: "short", year: "2-digit" }),
    };
  });

  return (
    <Card title="Sales Analytics (Last 12 Months)" description="Order count by month" padding="p-6" className={className}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={formattedData} margin={{ top: 10, left: 8, right: 8, bottom: 4 }}>
          {/* No CartesianGrid for blank background */}
          <XAxis dataKey="label" axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip />
          <Bar
            dataKey="orders"
            fill="#1d4ed8"
            radius={[6, 6, 0, 0]}
            isAnimationActive
            animationBegin={140}
            animationDuration={4200}
            animationEasing="ease-in-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}