// src/layouts/AdminLayout.jsx
import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { LogOut, BarChart2, LayoutDashboard, UserPlus } from "lucide-react"; // Import UserPlus icon
import { getAuth } from "firebase/auth";
import "../styles/AdminLayout.css";

// Assuming you'll define your routes in a higher-level component like App.jsx
// For now, the button will navigate to '/admin/assign-coordinator'

function PartialFooter() {
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
        <div className="navbar-header">
          <img src="https://www.auegov.ac.in/Department/public/assets/img/aulogo.png" alt="Logo" className="navbar-image" />
          <div className="navbar-logo-container">
            <div className="navbar-logo">Information Science and Technology</div>
            <div className="navbar-logo">Anna University</div>
          </div>
        </div>
        
      </nav>
      <div className="admin-body">
        <Outlet />
      </div>
    </div>
  );
}

export default PartialFooter;