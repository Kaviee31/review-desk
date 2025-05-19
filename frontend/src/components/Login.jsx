import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db, doc, getDoc } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import animationData from "../assets/login-animation.json";
import "../styles/Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const { username, profession, registerNumber } = userData;


        if (profession === "Teacher") {
          alert(`Welcome Teacher ${username}`);
          navigate("/teacher-dashboard");
        } else if (profession === "Student") {
          alert(`Welcome Student ${username} (Reg No: ${registerNumber})`);
          navigate("/student-dashboard");
        } else {
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
        <Lottie animationData={animationData} loop={true} />
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
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Login</button>

          <p style={{ color: "black", fontSize: "14px", marginTop: "10px", textAlign: "center" }}>
  Don't have an account? <Link to="/signup">Sign up</Link>
</p>

          <p>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
