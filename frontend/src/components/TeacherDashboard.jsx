import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import emailjs from '@emailjs/browser';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/TeacherDashboard.css';
export const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL
function TeacherDashboard() {
  const [announcement, setAnnouncement] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const navigate = useNavigate();
  
  const allPrograms = [
    "MCA(R)",
    "MCA(SS)",
    "MTECH(R)",
    "MTECH(SS)",
    "B.TECH(IT)",
    "B.TECH(IT) SS"
  ];

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

  const sendAnnouncement = async (mode) => {
    if (!announcement.trim()) {
      toast.error("Announcement message cannot be empty");
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/teacher-courses/${teacherEmail}`);
      let enrolledStudents = response.data;

      if (programFilter) {
        enrolledStudents = enrolledStudents.filter(
          (student) => student.courseName === programFilter
        );
      }

      if (!enrolledStudents.length) {
        toast.error("No students match the selected filter.");
        return;
      }

      const bccEmails = enrolledStudents
        .filter(s => s.email?.trim())
        .map(s => s.email.trim());

      const registerNumbers = enrolledStudents.map(s => s.registerNumber);

      // Send Email
      if (mode === 'email' || mode === 'both') {
        if (!bccEmails.length) {
          toast.warn("No student emails found for EmailJS.");
        } else {
          const templateParams = {
            message: announcement,
            to_name: "Student",
            to_email: "reviewdeskau@gmail.com",
            bcc: bccEmails.join(","),
            subject: "New Announcement from your Guide",
          };

          await emailjs.send(
            'service_zdkw9wb',
            'template_bdoxrlm',
            templateParams,
            'lBI3Htk5CKshSzMFg'
          );

          toast.success(`📧 Email sent to ${bccEmails.length} students.`);
        }
      }

      // Send Telegram
      if (mode === 'telegram' || mode === 'both') {
        const telegramRes = await axios.post(`${API_BASE_URL}/api/send-telegram`, {
          message: announcement,
          registerNumbers: registerNumbers,
        });

        const successCount = telegramRes.data?.successCount ?? 0;
        toast.success(`📲 Telegram sent to ${successCount} students.`);
      }

      setAnnouncement('');
    } catch (error) {
      console.error("Error sending announcement:", error);
      toast.error("Failed to send announcement.");
    }
  };

  const handleAnnouncementSubmit = (e) => {
    e.preventDefault();
    sendAnnouncement('both');
  };

  return (
    <div className="containers">
      <div className="dashboard-content">
        <h2>📣 Send Announcement to Students</h2>

        {/* Program Filter Dropdown */}
        <select
  value={programFilter}
  onChange={(e) => setProgramFilter(e.target.value)}
  className="program-dropdown"
  style={{ color: programFilter === "" ? "black" : "initial" }}
>
  <option value="">🎓 All Programs</option>
  {allPrograms.map(program => (
    <option key={program} value={program}>
      {program}
    </option>
  ))}
</select>


        <form onSubmit={handleAnnouncementSubmit}>
          <textarea
            placeholder="Type your announcement..."
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            required
            className="announcement-textarea"
          />

          <div className="button-group">
            <button
              type="button"
              className="send-button"
              onClick={() => sendAnnouncement('email')}
            >
              📧 Send Email Only
            </button>

            <button
              type="button"
              className="send-button"
              onClick={() => sendAnnouncement('telegram')}
            >
              📲 Send Telegram Only
            </button>

            <button type="submit" className="send-button">
              📢 Send Email + Telegram
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TeacherDashboard;
