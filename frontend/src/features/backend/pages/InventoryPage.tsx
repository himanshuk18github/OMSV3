import { useEffect, useState } from "react";
import { apiRequest } from "../api";

type InventoryRow = { id?: number; sku?: string; product_name?: string; available_qty?: number; quantity?: number };
type ApiResponse = { data?: { data?: InventoryRow[] } | InventoryRow[] };

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<ApiResponse>("/inventory")
      .then((res) => {
        const payload = res.data;
        if (Array.isArray(payload)) setRows(payload);
        else setRows(payload?.data || []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading inventory...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Inventory</h1>
      <div className="overflow-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row.id || row.sku || "inv"}-${idx}`} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3">{row.sku || "-"}</td>
                <td className="px-4 py-3">{row.product_name || "-"}</td>
                <td className="px-4 py-3">{row.available_qty ?? row.quantity ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
