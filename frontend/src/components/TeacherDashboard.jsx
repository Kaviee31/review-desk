import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import axios from 'axios';
import emailjs from '@emailjs/browser';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/TeacherDashboard.css';

function TeacherDashboard() {
  const [announcement, setAnnouncement] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const navigate = useNavigate();
  const BASE_URL = "http://localhost:5000";

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
      const response = await axios.get(`${BASE_URL}/teacher-courses/${teacherEmail}`);
      const enrolledStudents = response.data;

      if (!enrolledStudents.length) {
        toast.error("No students enrolled under your email.");
        return;
      }

      const usersSnapshot = await getDocs(collection(db, "users"));
      const bccEmails = [];
      const registerNumbers = [];

      usersSnapshot.forEach(doc => {
        const user = doc.data();
        if (
          user.profession === "Student" &&
          enrolledStudents.some(s => s.registerNumber === user.registerNumber)
        ) {
          bccEmails.push(user.email);
          registerNumbers.push(user.registerNumber);
        }
      });

      if (!bccEmails.length) {
        toast.error("No matching student emails found in Firestore.");
        return;
      }

      const templateParams = {
        message: announcement,
        to_name: "Student",
        to_email: "reviewdeskau@gmail.com",
        bcc: bccEmails.join(","),
      };

      await emailjs.send(
        'service_zdkw9wb',
        'template_bdoxrlm',
        templateParams,
        'lBI3Htk5CKshSzMFg'
      );

      const telegramRes = await axios.post(`${BASE_URL}/api/send-telegram`, {
        message: announcement,
        registerNumbers: registerNumbers,
      });

      const successCount = telegramRes.data?.successCount ?? 0;
      toast.success(`Announcement sent to ${bccEmails.length} students via Email & ${successCount} via Telegram`);
      setAnnouncement('');
    } catch (error) {
      console.error("Error sending announcement:", error);
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
          <button type="submit" className="send-button">Send Email + Telegram</button>
        </form>
      </div>
    </div>
  );
}

export default TeacherDashboard;
