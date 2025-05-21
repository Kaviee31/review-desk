// src/layouts/AdminLayout.jsx
import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { LogOut, BarChart2, LayoutDashboard } from "lucide-react";
import { getAuth } from "firebase/auth";
import "../styles/AdminLayout.css";

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="admin-layout">
      <nav className="admin-navbar">
        <div className="navbar-logo">🛠️ Admin Panel</div>
        <div className="navbar-links">
          <button
            className={isActive("/admin/dashboard") ? "active" : ""}
            onClick={() => navigate("/admin/dashboard")}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button
            className={isActive("/admin/report") ? "active" : ""}
            onClick={() => navigate("/admin/report")}
          >
            <BarChart2 size={18} /> Report
          </button>
          <button onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>
      <div className="admin-body">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
