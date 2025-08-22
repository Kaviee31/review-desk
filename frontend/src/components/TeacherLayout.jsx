import React, { useContext } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Users, LayoutDashboard } from "lucide-react";
import { getAuth } from "firebase/auth";
import RoleSwitcherDropdown from "./RoleSwitcherDropdown";  // ✅ imported
import "../styles/TeacherLayout.css";

function TeacherLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await getAuth().signOut();
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="teacher-layout">
      <nav className="teacher-navbar">
        <div className="navbar-header">
          <img src="https://www.auegov.ac.in/Department/public/assets/img/aulogo.png" alt="Logo" className="navbar-image" />
          <div className="navbar-logo-container">
            <div className="navbar-logo">Information Science and Technology</div>
            <div className="navbar-logo">Anna University</div>
          </div>
        </div>

        <div className="navbar-links">
          <button onClick={() => navigate("/teacher/dashboard")}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button onClick={() => navigate("/teacher/enrolled-students")}>
            <Users size={18} /> Enrolled Students
          </button>

          <RoleSwitcherDropdown />  {/* ✅ The dropdown inserted here */}

          <button onClick={handleLogout}><LogOut size={18} /> Logout</button>
        </div>
      </nav>

      <div className="teacher-body">
        <Outlet />
      </div>
    </div>
  );
}

export default TeacherLayout;
