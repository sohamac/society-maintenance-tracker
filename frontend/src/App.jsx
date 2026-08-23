import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import NavBar from "./components/NavBar";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ResidentDashboard from "./pages/ResidentDashboard";
import NewComplaint from "./pages/NewComplaint";
import ComplaintDetail from "./pages/ComplaintDetail";
import AdminDashboard from "./pages/AdminDashboard";
import NoticeBoard from "./pages/NoticeBoard";

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={
            <ProtectedRoute role="resident"><ResidentDashboard /></ProtectedRoute>
          } />
          <Route path="/complaints/new" element={
            <ProtectedRoute role="resident"><NewComplaint /></ProtectedRoute>
          } />
          <Route path="/complaints/:id" element={
            <ProtectedRoute><ComplaintDetail /></ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />

          <Route path="/notices" element={
            <ProtectedRoute><NoticeBoard /></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
