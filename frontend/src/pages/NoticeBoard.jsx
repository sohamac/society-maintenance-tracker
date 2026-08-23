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
    <div className="page">
      <h1>Notice Board</h1>

      {user?.role === "admin" && (
        <form onSubmit={handlePost} className="notice-form">
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} required />
          <label>
            <input type="checkbox" checked={isImportant} onChange={(e) => setIsImportant(e.target.checked)} />
            Mark as important
          </label>
          <button type="submit">Post Notice</button>
        </form>
      )}

      <ul className="notice-list">
        {notices.map((n) => (
          <li key={n.id} className={n.is_important ? "pinned" : ""}>
            {n.is_important && <span className="pin">📌</span>}
            <strong>{n.title}</strong>
            <p>{n.content}</p>
            <small>{new Date(n.created_at).toLocaleString()}</small>
          </li>
        ))}
      </ul>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
