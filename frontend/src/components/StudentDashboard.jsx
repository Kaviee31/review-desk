import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import axios from "axios";
import { LogOut, BookOpenCheck, User2 } from "lucide-react";
import "../styles/StudentDashboard.css"

function StudentDashboard() {
  const [studentName, setStudentName] = useState("Guest");
  const [registerNumber, setRegisterNumber] = useState("");
  const [courses, setCourses] = useState([
    {
      name: "Full Stack Software Development",
      teacher: "Dr. Sangeetha",
      teacherEmail: "tsai8004@gmail.com",
    },
    {
      name: "Design and Analysis of Algorithms",
      teacher: "Dr. Arul Deepa",
      teacherEmail: "pkssjr43@gmail.com",
    },
  ]);
  const [announcement, setAnnouncement] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async (user) => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setStudentName(userData.username || user.email);
          setRegisterNumber(userData.registerNumber || "");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchAnnouncements = async () => {
      try {
        const response = await axios.get("https://review-dashboard.onrender.com/all-messages");
        setAnnouncement(response.data);
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
    };

    onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user);
        fetchAnnouncements();
      }
    });
  }, []);

  const handleEnroll = async (courseName, teacherName, teacherEmail) => {
    try {
      await axios.post("https://review-dashboard.onrender.com/enroll", {
        studentName,
        registerNumber,
        courseName,
        teacherName,
        teacherEmail,
      });
      alert(`Enrolled successfully in ${courseName}!`);
      setCourses((prev) => prev.filter((course) => course.name !== courseName));
    } catch (error) {
      alert(error.response?.data?.error || "Error enrolling");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="student-dashboard">
      <nav className="navbar">
        <div className="navbar-logo">📘 ReviewDesk</div>
        <div className="navbar-links">
          <button onClick={() => navigate("/student-dashboard")}> <BookOpenCheck size={18} /> Dashboard </button>
          <button onClick={() => navigate("/student-courses")}> <User2 size={18} /> My Courses </button>
          <button onClick={handleLogout}> <LogOut size={18} /> Logout </button>
        </div>
      </nav>

      <div className="dashboard-body">
        <div className="profile-card">
          <h2>{studentName}</h2>
          <p>Register Number: {registerNumber}</p>
        </div>

        <div className={`announcement-section ${announcement?.length ? 'show' : ''}`}>
          {announcement && announcement.length > 0 && (
            <>
              <h3>📢 Announcements</h3>
              {announcement.map((item, index) => (
                <p key={index} className="announcement-item">{item.content}</p>
              ))}
            </>
          )}
        </div>

        <div className="courses-section">
          <h3>📖 Available Courses</h3>
          <div className="course-list">
            {courses.map((course, index) => (
              <div key={index} className="course-card">
                <p><strong>{course.name}</strong></p>
                <p>Instructor: {course.teacher}</p>
                <button onClick={() => handleEnroll(course.name, course.teacher, course.teacherEmail)}>
                  Enroll
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
