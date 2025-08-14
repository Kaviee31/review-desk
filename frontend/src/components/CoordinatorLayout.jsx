import React from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { LogOut, LayoutDashboard, KeyRound, Users } from "lucide-react";
import { getAuth } from "firebase/auth";
import RoleSwitcherDropdown from "../components/RoleSwitcherDropdown";
import "../styles/CoordinatorLayout.css";

function CoordinatorLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await getAuth().signOut();
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="coordinator-layout">
      <nav className="coordinator-navbar">
        <div className="navbar-logo">📘 Coordinator Panel</div>

        <div className="navbar-links">
          <button onClick={() => navigate("/coordinator/dashboard")}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button onClick={() => navigate("/coordinator/students")}> {/* New button */}
            <Users size={18} /> View Students
          </button>
          <button onClick={() => navigate("/coordinator/change-password")}>
            <KeyRound size={18} /> Change Password
          </button>

          <RoleSwitcherDropdown />

          <button onClick={handleLogout}><LogOut size={18} /> Logout</button>
        </div>
      </nav>

      <div className="coordinator-body">
        <Outlet />
      </div>
    </div>
  );
}

export default CoordinatorLayout;
