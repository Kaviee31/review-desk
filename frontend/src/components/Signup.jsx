import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import {
  setDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import "../styles/Signup.css";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profession, setProfession] = useState("Student");
  const [registerNumber, setRegisterNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const professions = ["Student", "Teacher", "Admin"];


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const usersRef = collection(db, "users");

      // Check duplicate username
      const usernameQuery = query(usersRef, where("username", "==", username));
      const usernameSnapshot = await getDocs(usernameQuery);
      if (!usernameSnapshot.empty) {
        setError("Username is already taken.");
        setLoading(false);
        return;
      }

      // Check duplicate register number for students
      if (profession === "Student") {
        const regQuery = query(usersRef, where("registerNumber", "==", registerNumber));
        const regSnapshot = await getDocs(regQuery);
        if (!regSnapshot.empty) {
          setError("Register number already exists.");
          setLoading(false);
          return;
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = {
        username,
        email,
        phoneNumber,
        profession,
        ...(profession === "Student" && { registerNumber }),
      };

      await setDoc(doc(db, "users", user.uid), userData);
      await sendEmailVerification(user);

      // Reset form
      setUsername("");
      setEmail("");
      setPassword("");
      setPhoneNumber("");
      setProfession("Student");
      setRegisterNumber("");

      alert("User registered successfully! Please check your email to verify your account.");

      if (profession === "Teacher") {
        navigate("/teacher-dashboard");
      } else {
        navigate("/student-dashboard");
      }

    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setError("The email is already registered.");
      } else if (error.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <form className="signup-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        {error && <div className="error-message">{error}</div>}

        <label>Username</label>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label>Email</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Phone Number</label>
        <input
          type="tel"
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
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

        <label>Profession</label>
        <select
        placeholder="Enter your password"
          value={profession}
          onChange={(e) => {
            setProfession(e.target.value);
            if (e.target.value !== "Student") setRegisterNumber("");
          }}
        >
          {professions.map((prof) => (
            <option key={prof} value={prof}>{prof}</option>
          ))}
        </select>

        {profession === "Student" && (
          <>
            <label>Register Number</label>
            <input
              type="text"
              placeholder="Enter your register number"
              value={registerNumber}
              onChange={(e) => setRegisterNumber(e.target.value)}
              required
            />
          </>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

       <p className="login-link">
  Already have an account? <Link to="/">Log in</Link>
</p>

      </form>
    </div>
  );
}

export default Signup;
