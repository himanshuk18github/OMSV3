import { useEffect, useState } from "react";
import { apiRequest } from "../api";

type Ticket = { id: number; subject?: string; status?: string; priority?: string; created_at?: string };
type ApiResponse = { data?: { data?: Ticket[] } | Ticket[] };

export default function TicketsPage() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<ApiResponse>("/tickets")
      .then((res) => {
        const payload = res.data;
        if (Array.isArray(payload)) setRows(payload);
        else setRows(payload?.data || []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading tickets...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Support Tickets</h1>
      <div className="overflow-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3">{row.id}</td>
                <td className="px-4 py-3">{row.subject || "-"}</td>
                <td className="px-4 py-3">{row.status || "-"}</td>
                <td className="px-4 py-3">{row.priority || "-"}</td>
                <td className="px-4 py-3">{row.created_at || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
