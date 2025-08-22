// StudentCourses.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import ChatWindow from "./ChatWindow";
import '../styles/StudentCourses.css';
import Footer from './Footer';

const UNSEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/134/134935.png";
const SEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/2462/2462719.png";
export const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL
function StudentCourses() {
  const [courses, setCourses] = useState([]);
  const [registerNumber, setRegisterNumber] = useState("");
  const [studentName, setStudentName] = useState(""); // kept if needed later
  const [selectedTeacherEmail, setSelectedTeacherEmail] = useState(null);
  const [unseenMessagesStatus, setUnseenMessagesStatus] = useState({});
  const [reviewComments, setReviewComments] = useState({});

  useEffect(() => {
    document.title = "Student Courses";
  }, []);

  useEffect(() => {
    const fetchRegisterNumber = async (user) => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRegisterNumber(data.registerNumber);
          setStudentName(data.username);
        }
      } catch (error) {
        console.error("Error fetching Firestore data:", error);
      }
    };

    onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchRegisterNumber(user);
      }
    });
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      if (registerNumber) {
        try {
          const response = await axios.get(`${API_BASE_URL}/student-courses/${registerNumber}`);
          setCourses(response.data);

          // Extract all comments from the first course object
          if (response.data.length > 0) {
            const courseData = response.data[0];
            setReviewComments({
              zeroth: courseData.zerothReviewComment || "No comment yet.",
              first: courseData.firstReviewComment || "No comment yet.",
              second: courseData.secondReviewComment || "No comment yet.",
              third: courseData.thirdReviewComment || "No comment yet.",
            });
          }
        } catch (error) {
          console.error("Error fetching student courses:", error);
        }
      }
    };

    fetchCourses();
}, [registerNumber]);

  const handleCloseChat = () => {
    setSelectedTeacherEmail(null);
  };

  const hasUnseenMessages = async (teacherEmail) => {
    if (!registerNumber || !teacherEmail) return false;

    const chatKey = registerNumber < teacherEmail
      ? `${registerNumber}_${teacherEmail}`
      : `${teacherEmail}_${registerNumber}`;

    const messagesRef = collection(db, "chats", chatKey, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const lastMessage = querySnapshot.docs[0].data();
      return lastMessage.senderId === teacherEmail;
    }

    return false;
  };

  useEffect(() => {
    const fetchUnseenStatuses = async () => {
      const statuses = {};
      for (const course of courses) {
        const hasUnseen = await hasUnseenMessages(course.teacherEmail);
        statuses[course.teacherEmail] = hasUnseen;
      }
      setUnseenMessagesStatus(statuses);
    };

    if (courses.length > 0) {
      fetchUnseenStatuses();
    }
  }, [courses, registerNumber]);

  const openChatWindow = (teacherEmail) => {
    setSelectedTeacherEmail(teacherEmail);
    setUnseenMessagesStatus(prev => ({
      ...prev,
      [teacherEmail]: false,
    }));
  };

  // StudentCourses.jsx

return (
  <div className="teacher-dashboard-layout">
    <div className="student-courses-container">
      <h1 className="main-title">Project Dashboard</h1>
      <h2 className="register-number-title">{registerNumber || "Loading..."}</h2>

      {courses.length > 0 ? (
        courses.map((course, index) => (
          <div key={index}>

            {/* Review Comments Card */}
            <div className="card comments-card">
              <h3 className="card-title">Guide's Review Comments</h3>
              <div className="comments-grid">
                {['zeroth', 'first', 'second', 'third'].map((reviewType) => (
                  <div className="comment-item" key={reviewType}>
                    <strong className="comment-title">{reviewType.charAt(0).toUpperCase() + reviewType.slice(1)} Review:</strong>
                    <p className="comment-text">{reviewComments[reviewType]}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Marks Card */}
            {/* StudentCourses.jsx */}

{/* Marks Card */}
<div className="card marks-card">
  <h3 className="card-title">Project Review Marks</h3>
  <div className="table-responsive">
    <table className="marks-table">
      <thead>
        <tr>
          <th>Register Number</th>
          <th>Assessment 1</th>
          <th>Assessment 2</th>
          <th>Assessment 3</th>
          <th>Average</th>
          <th>Contact Guide</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{registerNumber}</td>
          <td>{course.Assessment1}</td>
          <td>{course.Assessment2}</td>
          <td>{course.Assessment3}</td>
          <td>{course.Total}</td>
          <td className="contact-cell">
            <img
              src={
                unseenMessagesStatus[course.teacherEmail]
                  ? UNSEEN_MESSAGE_ICON_URL
                  : SEEN_MESSAGE_ICON_URL
              }
              alt="Chat with Guide"
              className="chat-icon"
              onClick={() => openChatWindow(course.teacherEmail)}
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

          </div>
        ))
      ) : (
        <p className="loading-text">Loading project details...</p>
      )}

      {selectedTeacherEmail && (
        <ChatWindow
          currentUser={registerNumber}
          contactUser={selectedTeacherEmail}
          onClose={handleCloseChat}
        />
      )}
    </div>
    <Footer />
    </div>
  );
}

export default StudentCourses;
