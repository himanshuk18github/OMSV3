import { useEffect, useState } from "react";
import API_BASE_URL from "../../apicallconfig";

type LoginEvent = {
  id: number;
  username: string;
  login_time: string;
  ip_address: string;
};

export default function LoginSessions() {
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const limit = 10;

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/get_login_events.php?page=${page}&limit=${limit}`, {
          credentials: "include"
        });
        const data = await res.json();
        setEvents(data.events || []);
        setTotalPages(data.totalPages || 1);
      } catch {
        setEvents([]);
        setTotalPages(1);
      }
      setLoading(false);
    }
    fetchEvents();
  }, [page]);

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white rounded-xl shadow-lg p-8">
      <h2 className="app-page-title mb-4 text-gray-800">Login Sessions</h2>
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <>
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border-b"># z to a</th>
                <th className="px-4 py-2 border-b">Username</th>
                <th className="px-4 py-2 border-b">Login Time</th>
                <th className="px-4 py-2 border-b">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No login events found.
                  </td>
                </tr>
              ) : (
                events.map((event, idx) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-2 border-b font-bold">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="px-4 py-2 border-b font-semibold">{event.username}</td>
                    <td className="px-4 py-2 border-b">{event.login_time}</td>
                    <td className="px-4 py-2 border-b">{event.ip_address}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex justify-between items-center">
            <button
              className="px-4 py-2 rounded bg-indigo-500 text-white disabled:opacity-60"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              className="px-4 py-2 rounded bg-indigo-500 text-white disabled:opacity-60"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}