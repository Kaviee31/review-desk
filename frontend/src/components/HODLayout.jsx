import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Users, LayoutDashboard } from "lucide-react";
import { getAuth } from "firebase/auth";
import "../styles/HODLayout.css";

function HODLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="hod-layout">
      <nav className="hod-navbar">
        <div className="navbar-header">
          <img src="https://www.auegov.ac.in/Department/public/assets/img/aulogo.png" alt="Logo" className="navbar-image" />
          <div className="navbar-logo-container">
            <div className="navbar-logo">Information Science and Technology</div>
            <div className="navbar-logo">Anna University</div>
          </div>
        </div>
        <div className="navbar-links">
          <button className={isActive("/hod/dashboard") ? "active" : ""}
            onClick={() => navigate("/hod/dashboard")}>
            <LayoutDashboard size={18} /> Dashboard
          </button>

          <button className={isActive("/hod/enrolled-students") ? "active" : ""}
            onClick={() => navigate("/hod/enrolled-students")}>
            <Users size={18} /> Students
          </button>

          <button onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>

      <div className="hod-body">
        <Outlet />
      </div>
    </div>
  );
}

export default HODLayout;
