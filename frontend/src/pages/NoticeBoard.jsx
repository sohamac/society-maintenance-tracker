import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function NoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const { user } = useAuth();

  function load(page = pagination.page) {
    client.get("/notices", { params: { page, limit: 10 } }).then((res) => {
      setNotices(res.data.data);
      setPagination(res.data.pagination);
    });
  }

  useEffect(() => load(1), []);

  async function handlePost(e) {
    e.preventDefault();
    await client.post("/notices", { title, content, is_important: isImportant });
    setTitle(""); setContent(""); setIsImportant(false);
    load(1);
  }

  return (
    <div className="page" style={{maxWidth: '800px'}}>
      <div className="page-header">
        <h1>Notice Board</h1>
      </div>

      {user?.role === "admin" && (
        <form onSubmit={handlePost} className="notice-form">
          <h3 style={{marginTop: 0, marginBottom: '1rem'}}>Post Announcement</h3>
          <input placeholder="Notice Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea placeholder="Write the announcement..." rows={4} value={content} onChange={(e) => setContent(e.target.value)} required />
          
          <div className="flex-between mt-4">
            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, cursor: 'pointer'}}>
              <input 
                type="checkbox" 
                checked={isImportant} 
                onChange={(e) => setIsImportant(e.target.checked)} 
                style={{width: 'auto', margin: 0}}
              />
              <span style={{color: 'var(--color-in-progress)'}}>Mark as Important (Sends Email Broadcast)</span>
            </label>
            <button type="submit" className="action-btn">Post Notice</button>
          </div>
        </form>
      )}

      <div className="notice-list">
        {notices.map((n) => (
          <div key={n.id} className={`notice-card ${n.is_important ? "pinned" : ""}`}>
            <div className="notice-title">
              {n.is_important && <span className="pin-badge">Important</span>}
              {n.title}
            </div>
            <p className="notice-content">{n.content}</p>
            <small className="notice-date">{new Date(n.created_at).toLocaleString()}</small>
          </div>
        ))}
        {notices.length === 0 && <p style={{color: 'var(--text-secondary)'}}>No notices posted yet.</p>}
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>
            Previous
          </button>
          <span style={{fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)'}}>Page {pagination.page} / {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
