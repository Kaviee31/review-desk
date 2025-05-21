import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Users, LayoutDashboard } from "lucide-react";
import { getAuth } from "firebase/auth";
import "../styles/TeacherLayout.css";

function TeacherLayout() {
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
    <div className="teacher-layout">
      <nav className="teacher-navbar">
        <div className="navbar-logo">📘 ReviewDesk</div>
        <div className="navbar-links">
          <button
            className={isActive("/teacher/dashboard") ? "active" : ""}
            onClick={() => navigate("/teacher/dashboard")}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button
            className={isActive("/teacher/enrolled-students") ? "active" : ""}
            onClick={() => navigate("/teacher/enrolled-students")}
          >
            <Users size={18} /> Enrolled Students
          </button>
          <button onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>

      <div className="teacher-body">
        <Outlet />
      </div>
    </div>
  );
}

export default TeacherLayout;
