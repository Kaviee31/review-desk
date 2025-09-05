// src/layouts/AdminLayout.jsx
import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { LogOut, BarChart2, LayoutDashboard, UserPlus } from "lucide-react"; // Import UserPlus icon
import { getAuth } from "firebase/auth";
import "../styles/AdminLayout.css";
import { FaFacebookF, FaTwitter, FaYoutube, FaLinkedinIn, FaInstagram } from "react-icons/fa";


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
          <div className="navbar-contact-details">
        <a href="mailto:istdept@auist.net" className="contact-link">istdept@auist.net</a>
        <a href="tel:04422358812" className="contact-link">044 2235 8812</a>
        <div className="social-media-icons">
          <a href="https://www.facebook.com/auchennaiofficial" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <FaFacebookF />
          </a>
          <a href="https://twitter.com/auvcochennai" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            <FaTwitter />
          </a>
          <a href="https://www.instagram.com/anna_university.chennai/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <FaInstagram />
          </a>
          <a href="https://www.youtube.com/channel/UCvR0vYmjwNCmVFyTdSAKvMA/" target="_blank" rel="noopener noreferrer" aria-label="Youtube">
            <FaYoutube />
          </a>
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