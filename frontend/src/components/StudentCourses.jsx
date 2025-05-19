import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import axios from "axios";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import ChatWindow from "./ChatWindow";
import "../styles/StudentCourses.css";

const UNSEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/134/134935.png";
const SEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/2462/2462719.png";

function StudentCourses() {
  const [courses, setCourses] = useState([]);
  const [registerNumber, setRegisterNumber] = useState("");
  const [studentName, setStudentName] = useState("");
  const [selectedTeacherEmail, setSelectedTeacherEmail] = useState(null);
  const [unseenMessagesStatus, setUnseenMessagesStatus] = useState({});
  const [loading, setLoading] = useState(true); // New state for loading

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
          const response = await axios.get(`https://review-dashboard.onrender.com/student-courses/${registerNumber}`);
          setCourses(response.data);
        } catch (error) {
          console.error("Error fetching student courses:", error);
        } finally {
          setLoading(false); // Stop loading after fetch
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
    setUnseenMessagesStatus((prevState) => ({
      ...prevState,
      [teacherEmail]: false,
    }));
  };

  return (
    <div className="courses-container">
      <h2 className="dashboard-title">Welcome, {studentName}!</h2>
      {loading ? (
        <div className="loading-spinner">
          <ClipLoader color="#36d7b7" size={40} />
          <p>Loading your enrolled courses...</p>
        </div>
      ) : courses.length > 0 ? (
        <div className="course-cards">
          {courses.map((course, index) => (
            <div className="course-card" key={index}>
              <h3>{course.courseName}</h3>
              <p><strong>Instructor:</strong> {course.teacherName}</p>
              <p><strong>Assessment 1:</strong> {course.Assessment1}</p>
              <p><strong>Assessment 2:</strong> {course.Assessment2}</p>
              <p><strong>Assessment 3:</strong> {course.Assessment3}</p>
              <p><strong>Average:</strong> {course.Total}</p>
              <div className="chat-icon" onClick={() => openChatWindow(course.teacherEmail)}>
                <img
                  src={
                    unseenMessagesStatus[course.teacherEmail]
                      ? UNSEEN_MESSAGE_ICON_URL
                      : SEEN_MESSAGE_ICON_URL
                  }
                  alt="Chat"
                  width="22"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No courses found for your account.</p>
      )}

      {selectedTeacherEmail && (
        <ChatWindow
          currentUser={registerNumber}
          contactUser={selectedTeacherEmail}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
}

export default StudentCourses;
