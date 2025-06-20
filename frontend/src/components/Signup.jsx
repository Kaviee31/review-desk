import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { setDoc, doc, collection, query, where, getDocs } from "firebase/firestore";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "../styles/Signup.css";

function Signup() {
  useEffect(() => { document.title = "Signup"; }, []);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userType, setUserType] = useState("Student");
  const [facultyRole, setFacultyRole] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [courseType, setCourseType] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const usersRef = collection(db, "users");

      // Check username uniqueness
      const usernameQuery = query(usersRef, where("username", "==", username));
      const usernameSnapshot = await getDocs(usernameQuery);
      if (!usernameSnapshot.empty) {
        toast.error("Username already exists.");
        setLoading(false);
        return;
      }

      if (userType === "Student") {
        const regQuery = query(usersRef, where("registerNumber", "==", registerNumber));
        const regSnapshot = await getDocs(regQuery);
        if (!regSnapshot.empty) {
          toast.error("Register number already exists.");
          setLoading(false);
          return;
        }
      }

      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Prepare Firestore data
      let userData = {
        username,
        email,
        phoneNumber,
        userType,
        roles: [],
      };

      if (userType === "Student") {
        userData.registerNumber = registerNumber;
        userData.courseType = courseType;
        userData.roles = ["Student"];
      } else if (userType === "Faculty") {
        userData.facultyId = facultyId;

        // Faculty Role assignment
        if (facultyRole === "Admin") {
          userData.roles = ["Admin"];
        } else if (facultyRole === "HOD") {
          userData.roles = ["HOD"];
        } else if (facultyRole === "Guide") {
          userData.roles = ["Teacher"];
        } else {
          toast.error("Please select valid Faculty Role.");
          setLoading(false);
          return;
        }
      }

      await setDoc(doc(db, "users", user.uid), userData);
      await sendEmailVerification(user);
      toast.success("Account created successfully. Verify your email!");

      navigate("/");
    } catch (error) {
      console.error(error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <form className="signup-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>

        <label>Username</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Phone Number</label>
        <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <label>Choose Your Role</label>
        <select value={userType} onChange={(e) => setUserType(e.target.value)}>
          <option value="Student">Student</option>
          <option value="Faculty">Faculty</option>
        </select>

        {userType === "Student" && (
          <>
            <label>Register Number</label>
            <input type="text" value={registerNumber} onChange={(e) => setRegisterNumber(e.target.value)} required />
            <label>Course Type</label>
            <select value={courseType} onChange={(e) => setCourseType(e.target.value)} required>
              <option value="">Select Course</option>
              <option value="MCA(R)">MCA(R)</option>
              <option value="MCA(SS)">MCA(SS)</option>
              <option value="MTECH(R)">MTECH(R)</option>
              <option value="MTECH(SS)">MTECH(SS)</option>
              <option value="B.TECH(IT)">B.TECH(IT)</option>
              <option value="B.TECH(IT) SS">B.TECH(IT) SS</option>
            </select>
          </>
        )}

        {userType === "Faculty" && (
          <>
            <label>Faculty ID</label>
            <input type="text" value={facultyId} onChange={(e) => setFacultyId(e.target.value)} required />
            <label>Faculty Role</label>
            <select value={facultyRole} onChange={(e) => setFacultyRole(e.target.value)} required>
              <option value="">Select Role</option>
              <option value="Guide">Guide</option>
              <option value="Admin">Admin</option>
              <option value="HOD">HOD</option>
            </select>
          </>
        )}

        <button type="submit" disabled={loading}>{loading ? "Registering..." : "Register"}</button>
        <p>Already have an account? <Link to="/">Login</Link></p>
      </form>
    </div>
  );
}

export default Signup;
