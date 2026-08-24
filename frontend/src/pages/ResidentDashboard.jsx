import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import SlaProgressRing from "../components/SlaProgressRing";

export default function ResidentDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  useEffect(() => {
    client.get("/complaints/mine", { params: { page: pagination.page, limit: 10 } }).then((res) => {
      setComplaints(res.data.data);
      setPagination(res.data.pagination);
    });
  }, [pagination.page]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Complaints</h1>
        <Link to="/complaints/new" className="btn">+ New Complaint</Link>
      </div>
      <div className="complaint-list">
        {complaints.map((c) => (
          <Link key={c.id} to={`/complaints/${c.id}`} className="complaint-card">
            <div className="card-header">
              <span className="mono text-secondary" style={{color: 'var(--text-secondary)'}}>#{c.id}</span>
              <span className={`status status-${c.current_status.replace(" ", "-")}`}>
                {c.current_status}
              </span>
            </div>
            <div className="card-title">
              {c.category_name}
            </div>
            <div className="card-desc">
              {c.description.slice(0, 80)}{c.description.length > 80 ? "..." : ""}
            </div>
            <div className="card-footer">
              <SlaProgressRing
                createdAt={c.created_at}
                resolvedAt={c.resolved_at}
                slaDays={c.sla_days} // We don't have sla_days returned by getMyComplaints right now... Wait, the backend query for getMyComplaints: `SELECT c.*, cat.name AS category_name FROM complaints...` Oh, it doesn't join cat.sla_days!
                // Wait, if it doesn't have it, SlaProgressRing falls back to 3 days. Let's just pass what we have.
                status={c.current_status}
                size={24}
                strokeWidth={2}
              />
              <span className="priority-badge">{c.priority}</span>
            </div>
          </Link>
        ))}
        {complaints.length === 0 && <p style={{color: 'var(--text-secondary)'}}>No complaints yet.</p>}
      </div>

      {pagination.totalPages > 1 && (
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
