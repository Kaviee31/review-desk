import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db } from '../firebase'; // Import db from your firebase.js config
import { collection, query, where, getDocs } from 'firebase/firestore'; // Import Firestore functions
import { toast } from 'react-toastify'; // For notifications
import 'react-toastify/dist/ReactToastify.css';
import '../styles/AdminDashboard.css'; // Assuming this CSS provides styling

function AdminDashboard() {
  useEffect(() => {
    document.title = "Admin Dashboard";
  }, []);

  const [studentRegNo, setStudentRegNo] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [studentCourseName, setStudentCourseName] = useState(''); // State for student's course name
  const [loadingEnroll, setLoadingEnroll] = useState(false); // Loading state for enrollment process

  // Define available course options for the admin to assign
  const availableCourses = ["MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(SS)"];


  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default form submission
    setLoadingEnroll(true); // Start loading state

    // Basic validation
    if (!studentRegNo || !teacherEmail || !studentCourseName) {
      toast.error("Please fill all fields: Student Register Number, Teacher Email, and Student Course Name.");
      setLoadingEnroll(false);
      return;
    }

    let fetchedStudentName = 'Unknown Student'; // Default name

    try {
      // 1. Fetch student's name from Firestore based on register number
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("registerNumber", "==", studentRegNo), where("profession", "==", "Student"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error(`No student found with Register Number: ${studentRegNo}. Please ensure the student has signed up.`);
        setLoadingEnroll(false);
        return;
      }

      // Assuming registerNumber is unique for students, we take the first match
      const studentDoc = querySnapshot.docs[0].data();
      fetchedStudentName = studentDoc.username; // Get the student's username as their name

      // 2. Proceed with enrollment API call using the fetched student name
      await axios.post("http://localhost:5000/enroll", {
        studentName: fetchedStudentName, // Use the fetched student's username
        registerNumber: studentRegNo,
        courseName: studentCourseName,
        teacherName: 'Admin Assigned Teacher', // This could also be fetched from teacher's signup data if needed
        teacherEmail,
      });

      toast.success(`Student ${fetchedStudentName} enrolled successfully!`);
      // Clear form fields
      setStudentRegNo('');
      setTeacherEmail('');
      setStudentCourseName('');
    } catch (error) {
      console.error("Error during student enrollment:", error);
      toast.error(`Error enrolling student: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoadingEnroll(false); // End loading state
    }
  };

  return (
    <div className='cont'>
    <div className="dashboard-content">
      <h2>Assign Student to Teacher</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="studentRegNo">Student Register Number:</label>
        <input
          type="text"
          id="studentRegNo"
          value={studentRegNo}
          onChange={(e) => setStudentRegNo(e.target.value)}
          required
        />
        <label htmlFor="teacherEmail">Teacher Email:</label>
        <input
          type="email"
          id="teacherEmail"
          value={teacherEmail}
          onChange={(e) => setTeacherEmail(e.target.value)}
          required
        />
        <label htmlFor="studentCourseName">Student Course Name:</label>
        <select
          id="studentCourseName"
          value={studentCourseName}
          onChange={(e) => setStudentCourseName(e.target.value)}
          required
        >
          <option value="">Select Course</option> {/* Default empty option */}
          {availableCourses.map(course => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>
        <button type="submit" disabled={loadingEnroll}>
          {loadingEnroll ? 'Enrolling...' : 'Enroll Student'}
        </button>
      </form>
    </div>
    </div>
  );
}

export default AdminDashboard;
