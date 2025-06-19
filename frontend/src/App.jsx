import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from "./components/Login";
import Signup from "./components/Signup";
import ForgotPassword from "./components/ForgotPassword";

import AdminDashboard from "./components/AdminDashboard";
import ReportPage from "./components/ReportPage";
import AssignCoordinator from "./components/AssignCoordinatorForm";

import StudentDashboard from "./components/StudentDashboard";
import StudentCourses from "./components/StudentCourses";

import TeacherDashboard from "./components/TeacherDashboard";
import EnrolledStudents from "./components/EnrolledStudents";

import CoordinatorDashboard from "./components/CoordinatorDashboard";
import ChangePassword from "./components/ChangePassword";

import HODDashboard from "./components/HODDashboard";

import AdminLayout from "./components/AdminLayout";
import TeacherLayout from "./components/TeacherLayout";
import StudentLayout from "./components/StudentLayout";
import HODLayout from "./components/HODLayout";

import RoleProtectedRoute from "./components/RoleProtectedRoute";
import { RoleProvider } from "./contexts/RoleContext";

function App() {
  return (
    <RoleProvider>
      <Router>
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>

          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/admin" element={<RoleProtectedRoute allowedRoles={["Admin"]}><AdminLayout /></RoleProtectedRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="report" element={<ReportPage />} />
            <Route path="assign-coordinator" element={<AssignCoordinator />} />
          </Route>

          <Route path="/student" element={<RoleProtectedRoute allowedRoles={["Student"]}><StudentLayout /></RoleProtectedRoute>}>
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="courses" element={<StudentCourses />} />
          </Route>

          <Route path="/teacher" element={<RoleProtectedRoute allowedRoles={["Teacher", "Coordinator"]}><TeacherLayout /></RoleProtectedRoute>}>
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="enrolled-students" element={<EnrolledStudents />} />
            <Route path="coordinator-dashboard" element={<CoordinatorDashboard />} />
            <Route path="change-password" element={<ChangePassword />} />
          </Route>

          <Route path="/hod" element={<RoleProtectedRoute allowedRoles={["HOD"]}><HODLayout /></RoleProtectedRoute>}>
            <Route path="dashboard" element={<HODDashboard />} />
            <Route path="enrolled-students" element={<EnrolledStudents />} />
          </Route>

        </Routes>
      </Router>
    </RoleProvider>
  );
}

export default App;
