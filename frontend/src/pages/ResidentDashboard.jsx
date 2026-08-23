import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

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
      <ul className="complaint-list">
        {complaints.map((c) => (
          <li key={c.id}>
            <Link to={`/complaints/${c.id}`}>
              <strong>{c.category_name}</strong> — {c.description.slice(0, 60)}
              <span className={`status status-${c.current_status.replace(" ", "-")}`}>
                {c.current_status}
              </span>
            </Link>
          </li>
        ))}
        {complaints.length === 0 && <p>No complaints yet.</p>}
      </ul>

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
