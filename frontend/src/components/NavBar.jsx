import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <nav className="navbar">
      <Link to={user.role === "admin" ? "/admin" : "/dashboard"}>Society Tracker</Link>
      <div className="nav-links">
        <Link to="/notices">Notice Board</Link>
        {user.role === "resident" && <Link to="/complaints/new">Raise Complaint</Link>}
        <button onClick={logout}>Log out</button>
      </div>
    </nav>
  );
}
