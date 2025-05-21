import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/AdminDashboard.css';

function AdminDashboard() {
  useEffect(() => {
    document.title = "Admin Dashboard";
  }, []);

  const [studentRegNo, setStudentRegNo] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await axios.post("http://localhost:5000/enroll", {
        studentName: 'Admin Input',
        registerNumber: studentRegNo,
        courseName: 'Admin Assigned Course',
        teacherName: 'Admin Assigned Teacher',
        teacherEmail,
      });
      alert("Student enrolled successfully!");
      setStudentRegNo('');
      setTeacherEmail('');
    } catch (error) {
      alert(error.response?.data?.error || "Error enrolling student");
    }
  };

  return (
    <div className='cont'>
    <div className="dashboard-content">
      <h2>Admin Dashboard</h2>
      <form onSubmit={handleSubmit}>
        <label>Student Register Number</label>
        <input
          type="text"
          value={studentRegNo}
          onChange={(e) => setStudentRegNo(e.target.value)}
          required
        />
        <label>Teacher Email</label>
        <input
          type="email"
          value={teacherEmail}
          onChange={(e) => setTeacherEmail(e.target.value)}
          required
        />
        <button type="submit">Submit</button>
      </form>
    </div>
    </div>
  );
}

export default AdminDashboard;
