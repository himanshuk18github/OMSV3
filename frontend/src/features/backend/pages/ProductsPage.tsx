import { useEffect, useState } from "react";
import { apiRequest } from "../api";

type Product = { id: number; name?: string; sku?: string; price?: number; stock?: number };
type ApiResponse = { data?: { data?: Product[] } | Product[] };

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<ApiResponse>("/products")
      .then((res) => {
        const payload = res.data;
        if (Array.isArray(payload)) setRows(payload);
        else setRows(payload?.data || []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading products...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Products</h1>
      <div className="overflow-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3">{row.id}</td>
                <td className="px-4 py-3">{row.name || "-"}</td>
                <td className="px-4 py-3">{row.sku || "-"}</td>
                <td className="px-4 py-3">{row.price ?? "-"}</td>
                <td className="px-4 py-3">{row.stock ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
