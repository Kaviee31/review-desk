import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, BookOpenCheck, User2 } from "lucide-react";
import { auth } from "../firebase";
import "../styles/StudentLayout.css";

function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="student-layout">
      <nav className="student-navbar">
        <div className="navbar-header">
          <img src="https://www.auegov.ac.in/Department/public/assets/img/aulogo.png" alt="Logo" className="navbar-image" />
          <div className="navbar-logo-container">
            <div className="navbar-logo">Information Science and Technology</div>
            <div className="navbar-logo">Anna University</div>
          </div>
        </div>
        <div className="navbar-links">
          <button
            className={isActive("/student/dashboard") ? "active" : ""}
            onClick={() => navigate("/student/dashboard")}
          >
            <BookOpenCheck size={18} /> Dashboard
          </button>
          <button
            className={isActive("/student/courses") ? "active" : ""}
            onClick={() => navigate("/student/courses")}
          >
            <User2 size={18} /> View Marks & Comments
          </button>
          <button
  className="telegram-btn"
  onClick={() => window.open("https://t.me/NewAnnouncementbot", "_blank")}
>
  🔔 Telegram Updates
</button>
          <button onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>

      <div className="student-body">
        <Outlet />
      </div>
    </div>
  );
}

export default StudentLayout;
