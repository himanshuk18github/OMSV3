import { useEffect, useState } from "react";
import { apiRequest } from "../api";

type Order = { id: number; ref_no?: string; status?: string; customer_name?: string; total_amount?: number };
type ApiResponse = { data?: { data?: Order[] } | Order[] };

export default function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<ApiResponse>("/orders")
      .then((res) => {
        const payload = res.data;
        if (Array.isArray(payload)) setRows(payload);
        else setRows(payload?.data || []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading orders...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Sales Orders</h1>
      <div className="overflow-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Reference</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3">{row.id}</td>
                <td className="px-4 py-3">{row.ref_no || "-"}</td>
                <td className="px-4 py-3">{row.customer_name || "-"}</td>
                <td className="px-4 py-3">{row.status || "-"}</td>
                <td className="px-4 py-3">{row.total_amount ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
