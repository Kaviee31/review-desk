// StudentCourses.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import ChatWindow from "./ChatWindow";
import '../styles/StudentCourses.css';

const UNSEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/134/134935.png";
const SEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/2462/2462719.png";

function StudentCourses() {
  const [courses, setCourses] = useState([]);
  const [registerNumber, setRegisterNumber] = useState("");
  const [studentName, setStudentName] = useState(""); // kept if needed later
  const [selectedTeacherEmail, setSelectedTeacherEmail] = useState(null);
  const [unseenMessagesStatus, setUnseenMessagesStatus] = useState({});

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
          const response = await axios.get(`http://localhost:5000/student-courses/${registerNumber}`);
          setCourses(response.data);
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

  return (
    <div>
      <h2>{registerNumber || "Loading..."}</h2>

      {courses.length > 0 ? (
        courses.map((course, index) => (
          <div key={index} style={{ marginBottom: "20px" }}>
            <h3>Course: {course.courseName} (Instructor: {course.teacherName})</h3>
            <table border="1">
              <thead>
                <tr>
                  <th>Register Number</th>
                  <th>Assessment 1</th>
                  <th>Assessment 2</th>
                  <th>Assessment 3</th>
                  <th>Average</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{registerNumber}</td>
                  <td>{course.Assessment1}</td>
                  <td>{course.Assessment2}</td>
                  <td>{course.Assessment3}</td>
                  <td>{course.Total}</td>
                  <td>
                    <img
                      src={
                        unseenMessagesStatus[course.teacherEmail]
                          ? UNSEEN_MESSAGE_ICON_URL
                          : SEEN_MESSAGE_ICON_URL
                      }
                      alt="Chat"
                      width="20"
                      style={{ cursor: "pointer" }}
                      onClick={() => openChatWindow(course.teacherEmail)}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p>Loading courses...</p>
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
