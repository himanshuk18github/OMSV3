import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Card from "../system/Card";

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export default function InventoryDonut({
  data,
  className = "",
}: {
  data: { out_of_stock: number; low_stock: number; available: number; total_products: number };
  className?: string;
}) {
  const chartData = [
    { name: "Available", value: data.available },
    { name: "Low Stock", value: data.low_stock },
    { name: "Out of Stock", value: data.out_of_stock },
  ];

  return (
    <Card title="Inventory Status" description="Item-wise closing stock breakdown" padding="p-4" className={className}>
      <ResponsiveContainer width="100%" height={285}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            fill="#465fff"
            isAnimationActive
            animationBegin={140}
            animationDuration={4200}
            animationEasing="ease-in-out"
            label={({ value }) => `${value}`}
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center app-body-normal">
        Total Products in Inventory: <span className="font-semibold text-text-primary">{data.total_products}</span>
      </div>
    </Card>
  );
}