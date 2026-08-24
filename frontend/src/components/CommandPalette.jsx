import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let items = [];

    // Static Navigation
    items.push({ id: "nav-dash", type: "Nav", title: "Go to Dashboard", action: () => navigate(user?.role === "admin" ? "/admin" : "/dashboard") });
    items.push({ id: "nav-notices", type: "Nav", title: "Notice Board", action: () => navigate("/notices") });
    if (user?.role === "resident") {
      items.push({ id: "nav-new", type: "Nav", title: "Raise Complaint", action: () => navigate("/complaints/new") });
    }
    items.push({ id: "nav-logout", type: "Action", title: "Log Out", action: logout });

    // Dynamic filtering of static items
    const filteredItems = items.filter(i => i.title.toLowerCase().includes(query.toLowerCase()));
    
    setResults(filteredItems);

    // If query is long enough, async fetch matching complaints (basic client-side match of a small recent list for demo)
    if ((query.length > 2 || query.startsWith("#")) && user) {
      const search = query.replace("#", "").toLowerCase();
      // Admin searches all, resident searches mine
      const endpoint = user.role === "admin" ? "/complaints" : "/complaints/mine";
      
      client.get(endpoint, { params: { limit: 20 } }).then(res => {
        const complaints = res.data.data || [];
        const matches = complaints.filter(c => 
          c.id.toString() === search || 
          c.description.toLowerCase().includes(search) ||
          c.category_name.toLowerCase().includes(search)
        ).map(c => ({
          id: `comp-${c.id}`,
          type: "Complaint",
          title: `Complaint #${c.id} - ${c.category_name}`,
          action: () => navigate(`/complaints/${c.id}`)
        }));
        
        if (matches.length > 0) {
          setResults([...filteredItems, ...matches]);
        }
      }).catch(err => console.error(err));
    }
  }, [query, isOpen, navigate, user, logout]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        results[selectedIndex].action();
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="cmd-k-overlay" onClick={onClose}>
      <div className="cmd-k-modal" onClick={e => e.stopPropagation()}>
        <input 
          ref={inputRef}
          className="cmd-k-input" 
          placeholder="Type a command or search (e.g., #ID)..."
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
        />
        <div className="cmd-k-list">
          {results.length === 0 && <div className="cmd-k-item" style={{justifyContent: 'center'}}>No results found</div>}
          {results.map((item, index) => (
            <div 
              key={item.id} 
              className={`cmd-k-item ${index === selectedIndex ? "active" : ""}`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => { item.action(); onClose(); }}
            >
              <div className="cmd-k-item-icon">{item.type === 'Nav' ? '→' : item.type === 'Action' ? '⚡' : '#'}</div>
              <div>{item.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
