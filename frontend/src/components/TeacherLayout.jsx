import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Users, LayoutDashboard, ClipboardList } from "lucide-react";
import { getAuth } from "firebase/auth";
import axios from "axios";
import RoleSwitcherDropdown from "./RoleSwitcherDropdown";
import ThemeToggle from "./ThemeToggle";
import { API_BASE_URL } from "./TeacherDashboard";
import "../styles/TeacherLayout.css";

function TeacherLayout() {
  const navigate = useNavigate();
  const [isOnPanel, setIsOnPanel] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user?.email) return;
    axios
      .get(`${API_BASE_URL}/api/panels/teacher/${encodeURIComponent(user.email)}`)
      .then((res) => setIsOnPanel(res.data.length > 0))
      .catch(() => {});
  }, []);

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

          {isOnPanel && (
            <button onClick={() => navigate("/teacher/panel-review")}>
              <ClipboardList size={18} /> Panel Review
            </button>
          )}

          <RoleSwitcherDropdown />  {/* ✅ The dropdown inserted here */}

          <ThemeToggle />

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
