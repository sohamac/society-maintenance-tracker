import { useEffect, useState } from "react";
import client from "../api/client";

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ status: "", category_id: "" });
  const [retryMsg, setRetryMsg] = useState("");

  useEffect(() => {
    client.get("/dashboard").then((res) => setStats(res.data));
  }, []);

  useEffect(() => {
    const params = { page: pagination.page, limit: 20 };
    if (filters.status) params.status = filters.status;
    if (filters.category_id) params.category_id = filters.category_id;
    client.get("/complaints", { params }).then((res) => {
      setComplaints(res.data.data);
      setPagination(res.data.pagination);
    });
  }, [filters, pagination.page]);

  async function updateStatus(id, status) {
    await client.patch(`/complaints/${id}`, { status });
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, current_status: status } : c)));
  }

  async function handleRetryNotifications() {
    setRetryMsg("Retrying...");
    const { data } = await client.post("/dashboard/retry-notifications");
    setRetryMsg(`Retried ${data.retried} of ${data.candidates} failed notification(s).`);
  }

  return (
    <div className="page">
      <h1>Admin Dashboard</h1>

      {stats && (
        <div className="stats">
          <div>Overdue: <strong>{stats.overdueCount}</strong></div>
          {stats.byStatus.map((s) => <div key={s.status}>{s.status}: {s.count}</div>)}
        </div>
      )}

      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => {
            setFilters({ ...filters, status: e.target.value });
            setPagination((p) => ({ ...p, page: 1 }));
          }}
        >
          <option value="">All statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <button onClick={handleRetryNotifications}>Retry failed notifications</button>
        {retryMsg && <span className="retry-msg">{retryMsg}</span>}
      </div>

      <table className="complaint-table">
        <thead>
          <tr>
            <th>ID</th><th>Resident</th><th>Category</th><th>Priority</th><th>Status</th><th>Overdue</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((c) => (
            <tr key={c.id} className={c.is_overdue ? "overdue" : ""}>
              <td>{c.id}</td>
              <td>{c.resident_name}</td>
              <td>{c.category_name}</td>
              <td>{c.priority}</td>
              <td>{c.current_status}</td>
              <td>{c.is_overdue ? "⚠️" : ""}</td>
              <td>
                <select value={c.current_status} onChange={(e) => updateStatus(c.id, e.target.value)}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
