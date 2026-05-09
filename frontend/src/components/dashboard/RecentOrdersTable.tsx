import Card from "../system/Card";

type RecentOrder = {
  ref_no: string;
  customer_name: string;
  sales_channel: string;
  sku_count: number;
  status: string;
};

const STATUS_CLASSES: Record<string, string> = {
  Delivered: "bg-success/10 text-success",
  Pending: "bg-primary/10 text-primary",
  Draft: "bg-primary/10 text-primary",
  Cancelled: "bg-error/10 text-error",
  Confirmed: "bg-warning/10 text-warning",
  Packed: "bg-brand-50 text-brand-700",
  Dispatched: "bg-sky-50 text-sky-700",
  "In Transit": "bg-warning/10 text-warning",
  "Rto Delivered": "bg-orange-50 text-orange-700",
  RTO: "bg-orange-50 text-orange-700",
};

export default function RecentOrdersTable({
  data,
}: {
  data: RecentOrder[];
}) {
  const rows = data?.slice(0, 5) ?? [];

  if (rows.length === 0) {
    return (
      <Card title="Recent Orders" description="Latest five orders" padding="p-6">
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-gray-25 text-center">
          <div>
            <p className="app-body-large text-text-primary">No recent orders available</p>
            <p className="mt-1 app-body-normal text-text-muted">Orders will appear here as soon as they are created.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Recent Orders" description="Latest five orders" padding="p-6" bodyClassName="pt-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left app-label">Order Reference Number</th>
              <th className="px-4 py-2 text-left app-label">Customer</th>
              <th className="px-4 py-2 text-left app-label">Channel</th>
              <th className="px-4 py-2 text-left app-label">SKU Count</th>
              <th className="px-4 py-2 text-left app-label">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order, index) => (
              <tr
                key={order.ref_no || index}
                className={`border-b border-border transition-colors ${order.ref_no ? "hover:bg-slate-50" : ""}`}
              >
                <td className="px-4 py-2 app-body-normal text-text-primary">{order.ref_no}</td>
                <td className="px-4 py-2 app-body-normal text-text-secondary">{order.customer_name}</td>
                <td className="px-4 py-2 app-body-normal text-text-secondary">{order.sales_channel}</td>
                <td className="px-4 py-2 app-body-normal text-text-secondary">{order.sku_count || ""}</td>
                <td className="px-4 py-2">
                  {order.status ? (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 app-label ${STATUS_CLASSES[order.status] || "bg-slate-100 text-text-secondary"}`}
                    >
                      {order.status}
                    </span>
                  ) : (
                    <span className="app-text-small">No status</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
