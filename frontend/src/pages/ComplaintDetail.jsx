import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client, { API_BASE } from "../api/client";
import SlaProgressRing from "../components/SlaProgressRing";

export default function ComplaintDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    client.get(`/complaints/${id}/history`).then((res) => setData(res.data));
  }, [id]);

  if (!data) return <div className="page"><p style={{color: 'var(--text-secondary)'}}>Loading...</p></div>;
  const { complaint, history } = data;

  const photoSrc = complaint.photo_url
    ? complaint.photo_url.startsWith("http")
      ? complaint.photo_url
      : `${API_BASE}${complaint.photo_url}`
    : null;

  return (
    <div className="page">
      <div className="complaint-detail-header">
        <div className="flex-between">
          <h1 style={{marginBottom: 0}}>Complaint #{complaint.id}</h1>
          <SlaProgressRing
            createdAt={complaint.created_at}
            resolvedAt={complaint.resolved_at}
            slaDays={3} // We don't have cat.sla_days here without backend change, so assuming 3
            status={complaint.current_status}
            size={36}
            strokeWidth={3}
          />
        </div>
        <p style={{fontSize: '1.05rem', marginTop: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6}}>{complaint.description}</p>
        <div className="mt-4 gap-4" style={{display: 'flex', alignItems: 'center'}}>
          <span className={`status status-${complaint.current_status.replace(" ", "-")}`}>
            {complaint.current_status}
          </span>
          <span className="priority-badge">Priority: {complaint.priority}</span>
        </div>

        {photoSrc && (
          <>
            <img 
              src={photoSrc} 
              alt="Complaint" 
              className="complaint-photo" 
              onClick={() => setLightboxOpen(true)}
            />
            {lightboxOpen && (
              <div className="photo-lightbox" onClick={() => setLightboxOpen(false)}>
                <img src={photoSrc} alt="Complaint full preview" />
              </div>
            )}
          </>
        )}
      </div>

      <h2 style={{marginTop: '2.5rem'}}>Audit Timeline</h2>
      <div className="timeline-container">
        {history.map((h) => {
          const isCreated = h.field_changed === "created";
          const isStatus = h.field_changed === "status";
          const isResolved = isStatus && h.new_value === "Resolved";
          let dotClass = "timeline-dot";
          if (isCreated) dotClass += " created";
          else if (isResolved) dotClass += " resolved";
          else if (isStatus) dotClass += " status";

          return (
            <div key={h.id} className="timeline-item">
              <div className={dotClass}></div>
              <div className="timeline-content">
                <div className="timeline-meta">
                  <span>{new Date(h.created_at).toLocaleString()}</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <span className="timeline-actor">{h.actor_name}</span>
                  <span className="timeline-role">{h.actor_role}</span>
                </div>
                
                <div className="mt-4">
                  {isCreated ? (
                    <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Raised the complaint</span>
                  ) : (
                    <div className="timeline-change">
                      <span style={{textTransform: 'capitalize'}}>{h.field_changed}</span>: 
                      <span style={{opacity: 0.5}}>{h.old_value}</span> 
                      <span>→</span> 
                      <strong>{h.new_value}</strong>
                    </div>
                  )}
                </div>

                {h.note && (
                  <div className="timeline-note">
                    "{h.note}"
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
