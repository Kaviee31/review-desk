import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import axios from 'axios';
import emailjs from '@emailjs/browser';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/EnrolledStudents.css';

function TeacherDashboard() {
  const [announcement, setAnnouncement] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Guide Dashboard";
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setTeacherEmail(user.email);
    }
  }, []);

  const handleLogout = async () => {
    const auth = getAuth();
    await auth.signOut();
    navigate('/');
  };

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    if (!announcement.trim()) {
      toast.error("Announcement message cannot be empty");
      return;
    }

    try {
      // 1. Get enrolled students for this teacher
      const response = await axios.get(`http://localhost:5000/teacher-courses/${teacherEmail}`);
      const enrolledStudents = response.data;

      if (!enrolledStudents.length) {
        toast.error("No students enrolled under your email.");
        return;
      }

      // 2. Get user records from Firestore
      const usersSnapshot = await getDocs(collection(db, "users"));
      const bccEmails = [];

      usersSnapshot.forEach(doc => {
        const user = doc.data();
        if (
          user.profession === "Student" &&
          enrolledStudents.some(s => s.registerNumber === user.registerNumber)
        ) {
          bccEmails.push(user.email);
        }
      });

      if (!bccEmails.length) {
        toast.error("No matching student emails found in Firestore.");
        return;
      }

      // 3. Send Email via EmailJS
      const templateParams = {
        message: announcement,
        to_name: "Student", // EmailJS will personalize per student if needed
        to_email: "reviewdeskau@gmail.com", // required but not used if BCC
        bcc: bccEmails.join(","),
      };

      await emailjs.send(
        'service_zdkw9wb',
        'template_bdoxrlm',
        templateParams,
        'lBI3Htk5CKshSzMFg'
      );

      toast.success("Announcement sent to all enrolled students!");
      setAnnouncement('');
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send announcement.");
    }
  };

  return (
    <div className="cont">
      <div className="dashboard-content">
        <h2>📣 Send Announcement to Students</h2>
        <form onSubmit={handleAnnouncementSubmit}>
          <textarea
            placeholder="Type your announcement..."
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            required
            className="announcement-textarea"
          />
          <button type="submit" className="send-button">Send Email</button>
        </form>
      </div>
    </div>
  );
}

export default TeacherDashboard;
