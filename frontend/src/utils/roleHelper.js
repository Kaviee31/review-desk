export function redirectToDashboard(navigate, role) {
  switch (role) {
    case "Admin":
      navigate("/admin/dashboard");
      break;
    case "Teacher":
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
