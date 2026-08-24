import { useState } from "react";
import SlaProgressRing from "./SlaProgressRing";
import { Link } from "react-router-dom";

const COLUMNS = ["Open", "In Progress", "Resolved"];

export default function KanbanBoard({ complaints, updateStatus }) {
  const [dragOverCol, setDragOverCol] = useState(null);

  function handleDragStart(e, complaintId) {
    e.dataTransfer.setData("complaintId", complaintId);
  }

  function handleDragOver(e, col) {
    e.preventDefault();
    if (dragOverCol !== col) setDragOverCol(col);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragOverCol(null);
  }

  function handleDrop(e, col) {
    e.preventDefault();
    setDragOverCol(null);
    const complaintId = e.dataTransfer.getData("complaintId");
    if (complaintId) {
      updateStatus(Number(complaintId), col);
    }
  }

  return (
    <div className="kanban-board">
      {COLUMNS.map((col) => (
        <div
          key={col}
          className="kanban-column"
          onDragOver={(e) => handleDragOver(e, col)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, col)}
          style={{ borderColor: dragOverCol === col ? "var(--accent-primary)" : "var(--border)" }}
        >
          <div className="kanban-col-header">
            <span className="kanban-col-title">{col}</span>
            <span className="kanban-col-count">
              {complaints.filter((c) => c.current_status === col).length}
            </span>
          </div>
          {complaints
            .filter((c) => c.current_status === col)
            .map((c) => (
              <div
                key={c.id}
                className="kanban-card"
                draggable
                onDragStart={(e) => handleDragStart(e, c.id)}
              >
                <div className="card-header">
                  <span className="mono" style={{ color: "var(--text-secondary)" }}>#{c.id}</span>
                  <span className="priority-badge">{c.priority}</span>
                </div>
                <div className="card-title mt-4">
                  <Link to={`/complaints/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {c.category_name}
                  </Link>
                </div>
                <div className="card-desc">
                  {c.resident_name}
                </div>
                <div className="card-footer mt-4">
                  <SlaProgressRing
                    createdAt={c.created_at}
                    resolvedAt={c.resolved_at}
                    slaDays={c.sla_days}
                    status={c.current_status}
                    size={24}
                    strokeWidth={2}
                  />
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
