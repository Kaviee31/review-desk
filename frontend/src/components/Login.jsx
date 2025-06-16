import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import animationData from "../assets/login-animation.json";
import { toast } from 'react-toastify'; // Import toast for notifications
import 'react-toastify/dist/ReactToastify.css'; // Import toast CSS
import "../styles/Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Login";
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const { username, profession, registerNumber } = userData; // 'profession' now holds the specific role (Student, Guide, Admin, HOD)

        switch (profession) {
          case "Guide": // Renamed Teacher to Guide
            toast.success(`Welcome Guide ${username}`); // Use toast
            navigate("/teacher/dashboard"); // Route remains /teacher/dashboard
            break;
          case "Student":
            toast.success(`Welcome Student ${username} (Reg No: ${registerNumber})`); // Use toast
            navigate("/student-dashboard");
            break;
          case "Admin":
            toast.success(`Welcome Admin ${username}`); // Use toast
            navigate("/admin/dashboard");
            break;
          case "HOD": // New case for HOD
            toast.success(`Welcome HOD ${username}`); // Use toast
            navigate("/hod/dashboard"); // New route for HOD dashboard
            break;
          case "Coordinator":
            alert(`Welcome Coordinator ${username}`);
            navigate("/coordinator/dashboard");
            break;
          default:
            toast.error("Unknown profession."); // Use toast
            navigate("/"); // Navigate to root or a general fallback
        }
      } else {
        toast.error("User profile not found in database."); // Use toast
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(`Login failed: ${error.message}`); // Use toast
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <Lottie animationData={animationData} loop />
      </div>

      <div className="login-right">
        <form className="login-form" onSubmit={handleLogin}>
          <h2>Log In</h2>

          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ backgroundColor: "#f0e6ff" }}
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ backgroundColor: "#f0e6ff" }}
          />

          <button type="submit">Login</button>

          <p className="login-footer-text">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
          <p className="login-footer-text">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
