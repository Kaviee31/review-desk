import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";       // Import Signup component
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import ForgotPassword from "./components/ForgotPassword";
import StudentCourses from "./components/StudentCourses"; // adjust path if needed
import EnrolledStudents from "./components/EnrolledStudents";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />    {/* Add this */}
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/student-courses" element={<StudentCourses />} />
        <Route path="/enrolled-students" element={<EnrolledStudents />} />

        {/* Add other routes */}
      </Routes>
    </Router>
  );
}

export default App;
