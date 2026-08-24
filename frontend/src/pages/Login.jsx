import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const user = await login(email, password);
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  }

  return (
    <div className="auth-page">
      <div style={{textAlign: 'center', marginBottom: '2rem'}}>
        <h1 style={{marginBottom: '0.5rem'}}>Welcome Back</h1>
        <p style={{color: 'var(--text-secondary)', marginTop: 0}}>Sign in to Society Tracker</p>
      </div>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button type="submit" style={{width: '100%', fontSize: '1.05rem', padding: '0.85rem'}}>Log In</button>
      </form>
      <p>No account? <Link to="/register">Register here</Link></p>
    </div>
  );
}
