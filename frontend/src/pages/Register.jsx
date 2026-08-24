import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", apartment_no: "" });
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  }

  return (
    <div className="auth-page">
      <div style={{textAlign: 'center', marginBottom: '2rem'}}>
        <h1 style={{marginBottom: '0.5rem'}}>Join Society Tracker</h1>
        <p style={{color: 'var(--text-secondary)', marginTop: 0}}>Create your resident account</p>
      </div>
      <form onSubmit={handleSubmit}>
        <input placeholder="Full Name" value={form.name} onChange={update("name")} required />
        <input type="email" placeholder="Email Address" value={form.email} onChange={update("email")} required />
        <input type="password" placeholder="Create Password" value={form.password} onChange={update("password")} required />
        <input placeholder="Apartment No. (e.g. B-402)" value={form.apartment_no} onChange={update("apartment_no")} />
        {error && <p className="error">{error}</p>}
        <button type="submit" style={{width: '100%', fontSize: '1.05rem', padding: '0.85rem'}}>Register</button>
      </form>
      <p>Already have an account? <Link to="/login">Log in here</Link></p>
    </div>
  );
}
