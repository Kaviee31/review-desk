import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
  useEffect(() => {
    document.title = "Signup";
  }, []);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profession, setProfession] = useState("Student");
  const [registerNumber, setRegisterNumber] = useState("");
  const [facultyId, setFacultyId] = useState("");
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

      // Check duplicate register number
      if (profession === "Student") {
        const regQuery = query(usersRef, where("registerNumber", "==", registerNumber));
        const regSnapshot = await getDocs(regQuery);
        if (!regSnapshot.empty) {
          setError("Register number already exists.");
          setLoading(false);
          return;
        }
      }

      // Faculty ID required for Teacher/Admin
      if ((profession === "Teacher" || profession === "Admin") && !facultyId) {
        setError("Faculty ID is required for Teachers and Admins.");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = {
        username,
        email,
        phoneNumber,
        profession,
        ...(profession === "Student" && { registerNumber }),
        ...((profession === "Teacher" || profession === "Admin") && { facultyId }),
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
      setFacultyId("");

      alert("User registered successfully! Please check your email to verify your account.");

      // Navigate based on profession
      if (profession === "Teacher") {
        navigate("/teacher-dashboard", { replace: true });
      } else if (profession === "Admin") {
        navigate("/admin-dashboard", { replace: true });
      } else {
        navigate("/student-dashboard", { replace: true });
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
          value={profession}
          onChange={(e) => {
            const selected = e.target.value;
            setProfession(selected);
            if (selected === "Student") {
              setFacultyId("");
            } else {
              setRegisterNumber("");
            }
          }}
          required
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

        {(profession === "Teacher" || profession === "Admin") && (
          <>
            <label>Faculty ID</label>
            <input
              type="text"
              placeholder="Enter your faculty ID"
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
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

