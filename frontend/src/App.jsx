import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from 'react-toastify'; // ✅ Import toast container
import 'react-toastify/dist/ReactToastify.css'; // ✅ Toastify styles

import Login from "./components/Login";
import Signup from "./components/Signup";
import ForgotPassword from "./components/ForgotPassword";

import StudentDashboard from "./components/StudentDashboard";
import StudentCourses from "./components/StudentCourses";
import StudentLayout from "./components/StudentLayout";

import TeacherDashboard from "./components/TeacherDashboard";
import EnrolledStudents from "./components/EnrolledStudents";
import TeacherLayout from "./components/TeacherLayout";

import AdminDashboard from "./components/AdminDashboard";
import ReportPage from "./components/ReportPage";
import AdminLayout from "./components/AdminLayout";
import AssignCoordinatorForm from "./components/AssignCoordinatorForm";


import CoordinatorDashboard from './components/CoordinatorDashboard';
import CoordinatorLayout from "./components/CoordinatorLayout";
import ChangePassword from "./components/ChangePassword";

import HODDashboard  from "./components/HODDashboard";


function App() {
  return (
    <Router>
      {/* Toast Container - Global Placement */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin Layout Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="assign-coordinator" element={<AssignCoordinatorForm />} />
        </Route>

        {/* Student Layout Routes */}
        <Route path="/student-dashboard" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCourses />} />
        </Route>

        {/* Teacher Layout Routes */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="enrolled-students" element={<EnrolledStudents />} />
        </Route>
        <Route path="/coordinator" element={<CoordinatorLayout />}>
  <Route path="dashboard" element={<CoordinatorDashboard />} />
  <Route path="change-password" element={<ChangePassword />} />
   </Route>

   <Route path="/hod/dashboard" element={<HODDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
