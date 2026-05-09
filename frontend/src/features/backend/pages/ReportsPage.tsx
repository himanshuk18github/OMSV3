import { useEffect, useState } from "react";
import { apiRequest } from "../api";

type TopProduct = { name?: string; product_name?: string; qty?: number; total_qty?: number };
type SalesResponse = { data?: unknown };
type TopProductsResponse = { data?: TopProduct[] };

export default function ReportsPage() {
  const [salesData, setSalesData] = useState<unknown>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest<SalesResponse>("/reports/sales"),
      apiRequest<TopProductsResponse>("/reports/top-products"),
    ])
      .then(([sales, top]) => {
        setSalesData(sales.data ?? null);
        setTopProducts(top.data || []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading reports...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Reports</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-lg font-semibold">Sales Summary</h2>
        <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">{JSON.stringify(salesData, null, 2)}</pre>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-lg font-semibold">Top Products</h2>
        <ul className="space-y-2 text-sm">
          {topProducts.map((p, idx) => (
            <li key={`${p.name || p.product_name || "p"}-${idx}`} className="flex items-center justify-between border-b border-gray-100 py-2 dark:border-gray-800">
              <span>{p.name || p.product_name || "Product"}</span>
              <span className="font-semibold">{p.qty ?? p.total_qty ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
