import { useEffect, useState } from "react";
import api from "../api";

export default function AdminApprovals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/auth/pending");
      const data = res.data;
      setItems(data || []);
    } catch (e) {
      setError("Network error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id) {
    if (!window.confirm("Approve this signup and send reset token?")) return;
    try {
      const res = await api.post(`/auth/approve/${id}`);
      const data = res.data || {};
      alert(
        `Approved. Reset token has been emailed/logged.\n\nEmail: ${
          data.email || ""
        }`
      );
      load();
    } catch (e) {
      alert("Network error");
    }
  }

  async function decline(id) {
    if (!window.confirm("Decline this signup?")) return;
    try {
      const res = await api.post(`/auth/decline/${id}`);
      const data = res.data || {};
      alert("Signup declined.");
      load();
    } catch (e) {
      alert("Network error");
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Pending Signups</h2>
        <button
          className="px-3 py-1 rounded bg-sky-600 text-white text-sm"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-1 text-left">ID</th>
              <th className="px-2 py-1 text-left">Name</th>
              <th className="px-2 py-1 text-left">Email</th>
              <th className="px-2 py-1 text-left">Type</th>
              <th className="px-2 py-1 text-left">Customer</th>
              <th className="px-2 py-1 text-left">Phone</th>
              <th className="px-2 py-1 text-left">Country</th>
              <th className="px-2 py-1 text-left">Place</th>
              <th className="px-2 py-1 text-left">Submitted</th>
              <th className="px-2 py-1 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-2 py-3 text-center text-gray-500 text-sm"
                >
                  No pending signups
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-2 py-1">{u.id}</td>
                  <td className="px-2 py-1">{u.name || ""}</td>
                  <td className="px-2 py-1">{u.email}</td>
                  <td className="px-2 py-1">{u.signupType || ""}</td>
                  <td className="px-2 py-1">{u.customerName || ""}</td>
                  <td className="px-2 py-1">{u.phone || ""}</td>
                  <td className="px-2 py-1">{u.country || ""}</td>
                  <td className="px-2 py-1">{u.place || ""}</td>
                  <td className="px-2 py-1">
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleString()
                      : ""}
                  </td>
                  <td className="px-2 py-1 space-x-2">
                    <button
                      className="px-2 py-1 rounded bg-emerald-600 text-white text-xs"
                      onClick={() => approve(u.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                      onClick={() => decline(u.id)}
                    >
                      Decline
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
