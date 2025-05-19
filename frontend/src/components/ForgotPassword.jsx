import { useState } from "react";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";
import "../styles/ForgotPassword.css"; 
import Lottie from "lottie-react";
import animationData from "../assets/reset-password.json";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Please check your inbox.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="forgot-password-page">
      <form className="forgot-password-form" onSubmit={handleReset}>
        <div>
    <Lottie animationData={animationData} className="w-52 mx-auto mb-6" />
        </div>
         
         <h2>Forgot Password</h2>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <label>Email</label>
        <input
          type="email"
          placeholder="Enter your registered email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button type="submit">Send Reset Link</button>

        <p style={{ marginTop: "10px" }}>
          <Link to="/">Back to Login</Link>
        </p>
      </form>
    </div>
  );
}

export default ForgotPassword;
