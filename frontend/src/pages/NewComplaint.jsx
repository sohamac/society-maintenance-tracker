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
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const formData = new FormData();
    formData.append("category_id", categoryId);
    formData.append("description", description);
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
    <div className="page">
      <h1>Raise a Complaint</h1>
      <form onSubmit={handleSubmit}>
        <label>Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />

        <label>Photo (optional)</label>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />

        {error && <p className="error">{error}</p>}
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
