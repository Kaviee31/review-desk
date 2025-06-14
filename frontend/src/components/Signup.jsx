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
import "../styles/Signup.css"; // Assuming you have this CSS file for styling

function Signup() {
  // Set document title when the component mounts
  useEffect(() => {
    document.title = "Signup";
  }, []);

  // State variables for form fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profession, setProfession] = useState("Student"); // Default profession
  const [registerNumber, setRegisterNumber] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [courseType, setCourseType] = useState(""); // New state for course type
  const [loading, setLoading] = useState(false); // Loading state for async operations
  const [error, setError] = useState(null); // Error message state

  const navigate = useNavigate(); // Hook for navigation

  // Options for profession dropdown
  const professions = ["Student", "Teacher", "Admin"];
  // Options for course type dropdown (for students)
  const studentCourses = ["MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(SS)"];


  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setLoading(true); // Set loading to true during submission
    setError(null); // Clear any previous errors

    // Basic password length validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const usersRef = collection(db, "users");

      // Check for duplicate username
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
        // Validate if courseType is selected for students
        if (!courseType) {
            setError("Please select your course type.");
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

      // Create user with email and password using Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Prepare user data to be stored in Firestore
      const userData = {
        username,
        email,
        phoneNumber,
        profession,
        // Conditionally add registerNumber and courseType if profession is Student
        ...(profession === "Student" && { registerNumber, courseType }),
        // Conditionally add facultyId if profession is Teacher or Admin
        ...((profession === "Teacher" || profession === "Admin") && { facultyId }),
      };

      // Store user data in Firestore under a document named after the user's UID
      await setDoc(doc(db, "users", user.uid), userData);
      // Send email verification to the registered user
      await sendEmailVerification(user);

      // Reset form fields after successful registration
      setUsername("");
      setEmail("");
      setPassword("");
      setPhoneNumber("");
      setProfession("Student"); // Reset to default
      setRegisterNumber("");
      setFacultyId("");
      setCourseType(""); // Reset course type

      // Show success message (using a custom modal or message box would be better than alert)
      // Note: alert() is generally avoided in production React apps for better UX.
      console.log("User registered successfully! Please check your email to verify your account.");
      // You might want to implement a custom modal for this message
      // Example: showCustomMessage("User registered successfully! Please check your email to verify your account.");

      // Navigate based on profession
      if (profession === "Teacher") {
        navigate("/teacher/dashboard", { replace: true });
      } else if (profession === "Admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/student-dashboard", { replace: true });
      }

    } catch (error) {
      // Handle various Firebase authentication errors
      if (error.code === "auth/email-already-in-use") {
        setError("The email is already registered.");
      } else if (error.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError(error.message); // Catch any other errors
      }
    } finally {
      setLoading(false); // Always set loading to false after operation completes
    }
  };

  return (
    <div className="signup-page">
      <form className="signup-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        {error && <div className="error-message">{error}</div>} {/* Display error messages */}

        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="phoneNumber">Phone Number</label>
        <input
          id="phoneNumber"
          type="tel"
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label htmlFor="profession">Profession</label>
        <select
          id="profession"
          value={profession}
          onChange={(e) => {
            const selected = e.target.value;
            setProfession(selected);
            // Clear relevant fields when profession changes
            if (selected === "Student") {
              setFacultyId(""); // Clear faculty ID if switching to Student
            } else {
              setRegisterNumber(""); // Clear register number if not Student
              setCourseType(""); // Clear course type if not Student
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
            <label htmlFor="registerNumber">Register Number</label>
            <input
              id="registerNumber"
              type="text"
              placeholder="Enter your register number"
              value={registerNumber}
              onChange={(e) => setRegisterNumber(e.target.value)}
              required
            />

            <label htmlFor="courseType">Course Type</label>
            <select
              id="courseType"
              value={courseType}
              onChange={(e) => setCourseType(e.target.value)}
              required
            >
              <option value="">Select a Course</option> {/* Placeholder option */}
              {studentCourses.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </>
        )}

        {(profession === "Teacher" || profession === "Admin") && (
          <>
            <label htmlFor="facultyId">Faculty ID</label>
            <input
              id="facultyId"
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
