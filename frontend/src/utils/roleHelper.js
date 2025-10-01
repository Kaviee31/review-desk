// Line 1: Modify the function to accept an array of all roles.
export function redirectToDashboard(navigate, role, allRoles = []) {
  switch (role) {
    case "Admin":
      navigate("/admin/dashboard");
      break;
    // Lines 6-8: Add logic to check if a "Teacher" is also an "Admin".
    case "Teacher":
        // Otherwise, show the standard TeacherDashboard.
        navigate("/teacher/dashboard");
      
      break;
    case "Coordinator":
      navigate("/coordinator/dashboard");  
      break;
    case "Student":
      navigate("/student/dashboard");
      break;
    case "HOD":
      navigate("/hod/dashboard");
      break;
    default:
      navigate("/");
  }
}
