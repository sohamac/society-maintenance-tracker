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
      <h1>Resident Registration</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="Full name" value={form.name} onChange={update("name")} required />
        <input type="email" placeholder="Email" value={form.email} onChange={update("email")} required />
        <input type="password" placeholder="Password" value={form.password} onChange={update("password")} required />
        <input placeholder="Apartment no. (e.g. B-402)" value={form.apartment_no} onChange={update("apartment_no")} />
        {error && <p className="error">{error}</p>}
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
