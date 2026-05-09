import Card from "../system/Card";

export default function TopSellingProducts({
  data,
  className = "",
}: {
  data: { sku_fixed: string; product_name: string; count: number }[];
  className?: string;
}) {
  if (!data?.length) {
    return (
      <Card title="Top-Selling Products" description="Top 5 SKUs by units sold" padding="p-6" className={className}>
        <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-dashed border-border bg-gray-25 text-center">
          <div>
            <p className="app-body-large text-text-primary">No product ranking available</p>
            <p className="mt-1 app-body-normal text-text-muted">Product ranking will appear once sales are recorded.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Top-Selling Products" description="Top 5 SKUs by units sold" padding="p-6" className={className}>
      <div className="space-y-3">
        {data.slice(0, 5).map((prod, idx) => (
          <div key={prod.sku_fixed} className="flex items-center gap-3">
            <span className="w-6 shrink-0 app-label text-text-muted">{idx + 1}</span>
            <span className="min-w-0 flex-1 truncate app-body-normal text-text-primary">{prod.product_name}</span>
            <span className="shrink-0 app-label text-text-muted">{prod.count} sold</span>
          </div>
        ))}
      </div>
    </Card>
  );
}