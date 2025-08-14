import React from "react";
import { useNavigate } from "react-router-dom";

function RoleSwitcherDropdown() {
  const navigate = useNavigate();
  const availableRoles = JSON.parse(localStorage.getItem("availableRoles")) || [];
  const currentRole = localStorage.getItem("currentRole") || "";

  const handleChange = (e) => {
    const role = e.target.value;
    localStorage.setItem("currentRole", role);
    
    // Navigate based on selected role
    switch (role) {
      case "Teacher":
        navigate("/teacher/dashboard");
        break;
      case "Coordinator":
        // Navigating to the base coordinator path will render the CoordinatorLayout
        navigate("/coordinator/dashboard");
        break;
      case "Admin":
        navigate("/admin/dashboard");
        break;
      case "Student":
        navigate("/student/dashboard");
        break;
      case "HOD":
        navigate("/hod/dashboard");
        break;
      default:
        navigate("/");
    }
  };

  if (availableRoles.length <= 1) return null;

  return (
    <div className="role-switcher">
      <label>Switch Role:</label>
      <select value={currentRole} onChange={handleChange}>
        {availableRoles.map((role, idx) => (
          <option key={idx} value={role}>{role}</option>
        ))}
      </select>
    </div>
  );
}

export default RoleSwitcherDropdown;