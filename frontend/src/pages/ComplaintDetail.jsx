import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client, { API_BASE } from "../api/client";

export default function ComplaintDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get(`/complaints/${id}/history`).then((res) => setData(res.data));
  }, [id]);

  if (!data) return <p>Loading...</p>;
  const { complaint, history } = data;

  const photoSrc = complaint.photo_url
    ? complaint.photo_url.startsWith("http")
      ? complaint.photo_url
      : `${API_BASE}${complaint.photo_url}`
    : null;

  return (
    <div className="page">
      <h1>Complaint #{complaint.id}</h1>
      <p>{complaint.description}</p>
      {photoSrc && <img src={photoSrc} alt="Complaint" className="complaint-photo" />}
      <p>Status: <strong>{complaint.current_status}</strong> · Priority: {complaint.priority}</p>

      <h2>History</h2>
      <ul className="history-list">
        {history.map((h) => (
          <li key={h.id}>
            <span>{new Date(h.created_at).toLocaleString()}</span> —{" "}
            {h.field_changed === "created"
              ? `Complaint created by ${h.actor_name}`
              : `${h.field_changed} changed from ${h.old_value} to ${h.new_value} by ${h.actor_name}`}
            {h.note && <em> ({h.note})</em>}
          </li>
        ))}
      </ul>
    </div>
  );
}
