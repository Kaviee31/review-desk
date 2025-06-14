// src/components/CoordinatorLayout.jsx
import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { LogOut, LayoutDashboard, KeyRound } from "lucide-react"; // Key icon for password
import { getAuth } from "firebase/auth";
import "../styles/CoordinatorLayout.css";

function CoordinatorLayout() {
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
    <div className="coordinator-layout">
      <nav className="coordinator-navbar">
        <div className="navbar-logo">📘 Coordinator Panel</div>
        <div className="navbar-links">
          <button
            className={isActive("/coordinator/dashboard") ? "active" : ""}
            onClick={() => navigate("/coordinator/dashboard")}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button
            className={isActive("/coordinator/change-password") ? "active" : ""}
            onClick={() => navigate("/coordinator/change-password")}
          >
            <KeyRound size={18} /> Change Password
          </button>
          <button onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>

      <div className="coordinator-body">
        <Outlet />
      </div>
    </div>
  );
}

export default CoordinatorLayout;
