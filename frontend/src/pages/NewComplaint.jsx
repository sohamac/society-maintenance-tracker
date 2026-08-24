import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

const CATEGORIES = [
  { id: 1, name: "Plumbing" },
  { id: 2, name: "Electrical" },
  { id: 3, name: "Security" },
  { id: 4, name: "Housekeeping" },
  { id: 5, name: "Other" },
];

export default function NewComplaint() {
  const [categoryId, setCategoryId] = useState(1);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Low");
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const formData = new FormData();
    formData.append("category_id", categoryId);
    formData.append("description", description);
    formData.append("priority", priority);
    if (photo) formData.append("photo", photo);

    try {
      await client.post("/complaints", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit complaint");
    }
  }

  return (
    <div className="page" style={{maxWidth: '600px'}}>
      <div className="complaint-detail-header">
        <h1 style={{marginBottom: '1.5rem'}}>Raise a Complaint</h1>
        <form onSubmit={handleSubmit}>
          <label>Category</label>
          <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem'}}>
            {CATEGORIES.map((c) => (
              <div 
                key={c.id} 
                onClick={() => setCategoryId(c.id)}
                style={{
                  padding: '0.5rem 1rem', 
                  borderRadius: '999px',
                  border: `1px solid ${categoryId === c.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                  background: categoryId === c.id ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  color: categoryId === c.id ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
              >
                {c.name}
              </div>
            ))}
          </div>

          <label>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <label>Description</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            required 
            rows={5}
            placeholder="Describe the issue in detail..."
          />

          <label>Photo Attachment (optional)</label>
          <div style={{
            border: '1px dashed var(--border)', 
            padding: '2rem', 
            borderRadius: 'var(--radius-md)', 
            textAlign: 'center',
            marginBottom: '1.5rem',
            background: 'var(--bg-primary)'
          }}>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setPhoto(e.target.files[0])}
              style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }} 
            />
          </div>

          {error && <p className="error">{error}</p>}
          <button type="submit" style={{width: '100%', fontSize: '1.1rem', padding: '1rem'}}>Submit Complaint</button>
        </form>
      </div>
    </div>
  );
}
