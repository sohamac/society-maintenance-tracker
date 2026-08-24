import { useEffect, useState } from "react";
import client from "../api/client";
import KanbanBoard from "../components/KanbanBoard";
import SlaProgressRing from "../components/SlaProgressRing";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ status: "", category_id: "" });
  const [retryMsg, setRetryMsg] = useState("");
  const [viewMode, setViewMode] = useState("kanban"); // "table" or "kanban"

  useEffect(() => {
    client.get("/dashboard").then((res) => setStats(res.data));
  }, []);

  useEffect(() => {
    const params = { page: pagination.page, limit: viewMode === "kanban" ? 100 : 20 };
    if (filters.status) params.status = filters.status;
    if (filters.category_id) params.category_id = filters.category_id;
    
    client.get("/complaints", { params }).then((res) => {
      setComplaints(res.data.data);
      setPagination(res.data.pagination);
    });
  }, [filters, pagination.page, viewMode]);

  async function updateStatus(id, status) {
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, current_status: status } : c)));
    await client.patch(`/complaints/${id}`, { status });
    client.get("/dashboard").then((res) => setStats(res.data));
  }

  async function handleRetryNotifications() {
    setRetryMsg("Retrying...");
    const { data } = await client.post("/dashboard/retry-notifications");
    setRetryMsg(`Retried ${data.retried} of ${data.candidates} failed email(s).`);
    setTimeout(() => setRetryMsg(""), 5000);
  }

  return (
    <div className="page" style={{ maxWidth: '1200px' }}>
      <div className="page-header">
        <h1>Admin Console</h1>
        <div className="flex-between gap-4">
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <button 
              className={viewMode === "table" ? "btn-sm" : "btn-sm btn-secondary"} 
              style={{ border: 'none' }}
              onClick={() => { setViewMode("table"); setPagination(p => ({...p, page: 1})); }}
            >Table</button>
            <button 
              className={viewMode === "kanban" ? "btn-sm" : "btn-sm btn-secondary"} 
              style={{ border: 'none' }}
              onClick={() => { setViewMode("kanban"); setPagination(p => ({...p, page: 1})); }}
            >Kanban</button>
          </div>
        </div>
      </div>

      {stats && (
        <div className="stats">
          <div className="stat-card stat-overdue">
            <span className="stat-card-label">Overdue SLAs</span>
            <span className="stat-card-value">{stats.overdueCount}</span>
          </div>
          {stats.byStatus.map((s) => (
            <div key={s.status} className="stat-card">
              <span className="stat-card-label">{s.status}</span>
              <span className="stat-card-value">{s.count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="filters flex-between">
        <div className="flex-between gap-4">
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
        
        <div className="flex-between gap-4">
          {retryMsg && <span className="retry-msg" style={{color: 'var(--accent-emerald)'}}>{retryMsg}</span>}
          <button className="btn-secondary" onClick={handleRetryNotifications}>
            <span style={{marginRight: '0.5rem'}}>↻</span> Retry Failed Emails
          </button>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <KanbanBoard complaints={complaints} updateStatus={updateStatus} />
      ) : (
        <div className="table-container">
          <table className="complaint-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Resident</th>
                <th>Category</th>
                <th>Status</th>
                <th>SLA / Overdue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id} className={c.is_overdue ? "overdue" : ""}>
                  <td>
                    <Link to={`/complaints/${c.id}`} style={{color: 'inherit', textDecoration: 'none'}}>
                      <div style={{fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)'}}>#{c.id}</div>
                    </Link>
                  </td>
                  <td>{c.resident_name}</td>
                  <td>{c.category_name}</td>
                  <td><span className={`status status-${c.current_status.replace(" ", "-")}`}>{c.current_status}</span></td>
                  <td>
                    <SlaProgressRing
                      createdAt={c.created_at}
                      resolvedAt={c.resolved_at}
                      slaDays={c.sla_days}
                      status={c.current_status}
                      size={24}
                      strokeWidth={2}
                    />
                  </td>
                  <td>
                    <select 
                      value={c.current_status} 
                      onChange={(e) => updateStatus(c.id, e.target.value)}
                      style={{ padding: '0.4rem', fontSize: '0.85rem', width: 'auto', marginBottom: 0 }}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === "table" && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
          >
            Previous
          </button>
          <span style={{fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)'}}>Page {pagination.page} / {pagination.totalPages}</span>
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
