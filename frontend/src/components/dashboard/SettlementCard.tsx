import { FaRupeeSign } from "react-icons/fa";
import Card from "../system/Card";

type RevenueBreakdownItem = {
  label: string;
  value: number;
  color?: string;
};

export default function SettlementCard({
  title = "Sales / Revenue Till Date",
  description = "Delivered-only revenue split by sales channel",
  totalLabel = "Delivered Revenue",
  totalValue,
  breakdownLabel = "By Sales Channel",
  breakdownItems = [],
  className = "",
}: {
  title?: string;
  description?: string;
  totalLabel?: string;
  totalValue: number;
  breakdownLabel?: string;
  breakdownItems?: RevenueBreakdownItem[];
  className?: string;
}) {
  return (
    <Card className={`h-full ${className}`.trim()} title={title} description={description} padding="p-6">
      <div className="flex items-center gap-2 app-h2 text-success">
        <FaRupeeSign />
        <span>{Number(totalValue ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="mt-1 app-label text-text-muted">{totalLabel}</div>
      <div className="mt-4 space-y-3">
        <div className="app-label">{breakdownLabel}</div>
        {breakdownItems.length > 0 ? (
          breakdownItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 app-body-normal text-text-primary">
                <span className={`inline-block h-3 w-3 rounded-full`} style={{ backgroundColor: item.color || "#465fff" }} />
                {item.label}
              </span>
              <span className="app-body-normal text-text-primary">
                ₹ {Number(item.value || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-gray-25 px-4 py-3 text-center app-body-normal text-text-muted">
            No sales channel breakdown available.
          </div>
        )}
      </div>
    </Card>
  );
}