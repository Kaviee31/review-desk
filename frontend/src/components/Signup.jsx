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
import { toast } from 'react-toastify'; // Import toast for notifications
import 'react-toastify/dist/ReactToastify.css'; // Import toast CSS
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
  const [userType, setUserType] = useState("Student"); // Changed from 'profession' to 'userType'
  const [facultyRole, setFacultyRole] = useState(""); // New state for faculty role (Guide, Admin, HOD)
  const [registerNumber, setRegisterNumber] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [courseType, setCourseType] = useState(""); // New state for course type
  const [loading, setLoading] = useState(false); // Loading state for async operations
  const [error, setError] = useState(null); // Error message state

  const navigate = useNavigate(); // Hook for navigation

  // Options for user type dropdown
  const userTypes = ["Student", "Faculty"];
  // Options for faculty roles dropdown
  const facultyRoles = ["Guide", "Admin", "HOD"]; // Renamed Teacher to Guide
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

      // Logic based on userType
      if (userType === "Student") {
        // Check duplicate register number for students
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
      } else if (userType === "Faculty") { // If userType is Faculty
        // Faculty ID is required
        if (!facultyId) {
          setError("Faculty ID is required.");
          setLoading(false);
          return;
        }
        // Faculty Role is required
        if (!facultyRole) {
          setError("Please select your faculty role (Guide, Admin, or HOD).");
          setLoading(false);
          return;
        }
      }


      // Create user with email and password using Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Prepare user data to be stored in Firestore
      const userData = {
        username,
        email,
        phoneNumber,
        userType, // Store 'Student' or 'Faculty'
      };

      // Conditionally add student-specific fields
      if (userType === "Student") {
        userData.registerNumber = registerNumber;
        userData.courseType = courseType;
        userData.profession = "Student"; // Keep profession for backward compatibility/clarity
      }
      // Conditionally add faculty-specific fields
      else if (userType === "Faculty") {
        userData.facultyId = facultyId;
        userData.profession = facultyRole; // Store the specific role (Guide, Admin, HOD) as 'profession'
      }

      // Store user data in Firestore under a document named after the user's UID
      await setDoc(doc(db, "users", user.uid), userData);
      // Send email verification to the registered user
      await sendEmailVerification(user);

      // Reset form fields after successful registration
      setUsername("");
      setEmail("");
      setPassword("");
      setPhoneNumber("");
      setUserType("Student"); // Reset to default
      setFacultyRole(""); // Reset faculty role
      setRegisterNumber("");
      setFacultyId("");
      setCourseType(""); // Reset course type

      toast.success("Account created successfully! Please check your email to verify your account.");

      // Navigate based on profession (which is now derived from userType/facultyRole)
      if (userData.profession === "Guide") {
        navigate("/teacher/dashboard", { replace: true }); // Renamed Teacher to Guide
      } else if (userData.profession === "Admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (userData.profession === "HOD") { // New HOD route
        navigate("/hod/dashboard", { replace: true });
      }
      else if (userData.profession === "Student") {
        navigate("/student-dashboard", { replace: true });
      } else {
        // Fallback for unexpected profession
        console.warn("Unknown profession, navigating to root.");
        navigate("/", { replace: true });
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
      toast.error(`Error: ${error.message}`); // Display error using toast
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

        <label htmlFor="userType">User Type</label>
        <select
          id="userType"
          value={userType}
          onChange={(e) => {
            const selected = e.target.value;
            setUserType(selected);
            // Clear relevant fields when userType changes
            if (selected === "Student") {
              setFacultyId("");
              setFacultyRole(""); // Clear faculty role
            } else { // If "Faculty" is selected
              setRegisterNumber("");
              setCourseType("");
            }
          }}
          required
        >
          {userTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        {userType === "Student" && (
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

        {userType === "Faculty" && (
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
            <label htmlFor="facultyRole">Faculty Role</label>
            <select
              id="facultyRole"
              value={facultyRole}
              onChange={(e) => setFacultyRole(e.target.value)}
              required
            >
              <option value="">Select a Role</option> {/* Placeholder option */}
              {facultyRoles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
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
