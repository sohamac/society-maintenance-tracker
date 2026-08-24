import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import CommandPalette from "./CommandPalette";

export default function NavBar() {
  const { user, logout } = useAuth();
  const [cmdKOpen, setCmdKOpen] = useState(false);

  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdKOpen(prev => !prev);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  if (!user) return null;

  return (
    <>
      <nav className="navbar">
        <Link to={user.role === "admin" ? "/admin" : "/dashboard"}>
          <strong style={{fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.5px'}}>Society Tracker</strong>
        </Link>
        <div className="nav-links">
          <button className="cmd-k-btn" onClick={() => setCmdKOpen(true)}>
            <span>Search</span>
            <span style={{opacity: 0.5}}>⌘K</span>
          </button>
          <Link to="/notices">Notice Board</Link>
          {user.role === "resident" && <Link to="/complaints/new">Raise Complaint</Link>}
          <button onClick={logout}>Log out</button>
        </div>
      </nav>
      <CommandPalette isOpen={cmdKOpen} onClose={() => setCmdKOpen(false)} />
    </>
  );
}
