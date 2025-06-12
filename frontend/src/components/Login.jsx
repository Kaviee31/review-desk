import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import animationData from "../assets/login-animation.json";
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
        const { username, profession, registerNumber } = userDoc.data();

        switch (profession) {
          case "Teacher":
            alert(`Welcome Teacher ${username}`);
            navigate("/teacher/dashboard");
            break;
          case "Student":
            alert(`Welcome Student ${username} (Reg No: ${registerNumber})`);
            navigate("/student-dashboard");
            break;
          case "Admin":
            alert(`Welcome Admin ${username}`);
            navigate("/admin/dashboard");
            break;
          case "Coordinator":
            alert(`Welcome Coordinator ${username}`);
            navigate("/coordinator/dashboard");
            break;
          default:
            alert("Unknown profession.");
        }
      } else {
        alert("User profile not found.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert(error.message);
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
