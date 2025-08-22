import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import animationData from "../assets/login-animation.json";
import { toast } from 'react-toastify';
import { redirectToDashboard } from "../utils/roleHelper";
import "../styles/Login.css";
import Footer from './Footer';

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleSelection, setRoleSelection] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { document.title = "Login"; }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const { username, registerNumber } = userData;
        let roles = [];

        if (Array.isArray(userData.roles)) {
          roles = userData.roles;
        } else if (userData.profession) {
          roles = [userData.profession];
        } else {
          roles = ["Student"]; // fallback
        }

        localStorage.setItem("availableRoles", JSON.stringify(roles));
        localStorage.setItem("username", username);
        localStorage.setItem("registerNumber", registerNumber);

        if (roles.length === 1) {
          localStorage.setItem("currentRole", roles[0]);
          redirectToDashboard(navigate, roles[0]);
        } else {
          setRoleSelection(roles);
          toast.info("Select your role to continue");
        }
      } else {
        toast.error("User profile not found in database.");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(`Login failed: ${error.message}`);
    }
  };

  const handleRoleSelect = (role) => {
    localStorage.setItem("currentRole", role);
    redirectToDashboard(navigate, role);
  };

return (
  <div className="teacher-dashboard-layout">
    <div className="login-page">
      {/* 1. Moved the heading here, to the top level */}
      <h1 className="main-heading">IST's Review Desk</h1>

      {/* 2. New wrapper for the side-by-side content */}
      <div className="login-content">
        <div className="login-left">
          {/* The Lottie animation stays in the left column */}
          <Lottie animationData={animationData} loop />
        </div>
        
        <div className="login-right">
          {roleSelection.length === 0 ? (
            <form className="login-form" onSubmit={handleLogin}>
              <h2>Log In</h2>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="submit">Login</button>
              <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
              <p><Link to="/forgot-password">Forgot password?</Link></p>
            </form>
          ) : (
            <div className="role-selection">
              <h2>Select Role</h2>
              {roleSelection.map((role, index) => (
                <button key={index} onClick={() => handleRoleSelect(role)}>{role}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    <Footer />
    </div>
  );
}

export default Login;
