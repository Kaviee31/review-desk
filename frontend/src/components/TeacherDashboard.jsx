import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from "firebase/auth"; 
'../styles/EnrolledStudents.css';
import emailjs from '@emailjs/browser';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function TeacherDashboard() {
  useEffect(() => {
    document.title = "Guide Dashboard"; 
  }, []);

  const [announcement, setAnnouncement] = useState('');
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();

    if (!announcement) {
      toast.error("Announcement message cannot be empty");
      return;
    }

    try {
      const response = await axios.get("http://localhost:5000/all-students");
      const students = response.data;

      const bccEmails = students
        .filter((student) => student.registerNumber)
        .map((student) => `${student.registerNumber}@student.annauniv.edu`);

      if (bccEmails.length === 0) {
        toast.error("No valid student emails found.");
        return;
      }

      const templateParams = {
        to_name: "Student",
        message: announcement,
        bcc: bccEmails.join(","),
      };

      await emailjs.send(
        'service_bsbrxxs',
        'template_8snwbzk',
        templateParams,
        'KG_9zM7DeZhRC2vTX'
      );

      toast.success("Announcement sent via BCC!");
      setAnnouncement("");
    } catch (error) {
      console.error("Error sending announcement:", error);
      toast.error("Failed to send announcement");
    }
  };

  return (
    <div className='cont'>
    

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
