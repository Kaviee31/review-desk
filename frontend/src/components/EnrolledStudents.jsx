import React, { useState, useEffect } from "react";
import axios from "axios";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ChatWindow from "./ChatWindow";
import * as XLSX from "xlsx";
import "../styles/EnrolledStudents.css";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

const UNSEEN_MESSAGE_ICON_URL =
  "https://cdn-icons-png.flaticon.com/512/134/134935.png";
const SEEN_MESSAGE_ICON_URL =
  "https://cdn-icons-png.flaticon.com/512/2462/2462719.png";

function EnrolledStudents() {
  const [students, setStudents] = useState([]);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [selectedStudentRegisterNumber, setSelectedStudentRegisterNumber] = useState(null);
  const [unseenMessagesStatus, setUnseenMessagesStatus] = useState({});

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setTeacherEmail(user.email);
      }
    });
  }, []);

  const fetchStudents = () => {
    if (teacherEmail) {
      axios
        .get(`https://review-dashboard.onrender.com/teacher-courses/${teacherEmail}`)
        .then((res) => {
          const updatedStudents = res.data.map((student) => ({
            ...student,
            marks1: student.Assessment1 || "",
            marks2: student.Assessment2 || "",
            marks3: student.Assessment3 || "",
            marks4: Math.ceil((student.Assessment1 + student.Assessment2 + student.Assessment3) / 3),
            extraColumn: student.Contact || "",
            registerNumber: student.registerNumber,
          }));
          setStudents(updatedStudents);
        })
        .catch((err) => console.log(err));
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [teacherEmail]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStudents();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCloseChat = () => {
    setSelectedStudentRegisterNumber(null);
  };

  const handleMarkChange = (index, field, value) => {
    const updatedStudents = [...students];
    updatedStudents[index][field] = value;
    setStudents(updatedStudents);
  };

  const handleSaveAllMarks = () => {
    const payload = {
      students: students.map((student) => ({
        registerNumber: student.registerNumber,
        courseName: student.courseName,
        Assessment1: Number(student.marks1) || 0,
        Assessment2: Number(student.marks2) || 0,
        Assessment3: Number(student.marks3) || 0,
        Total: Number(student.marks4) || 0,
      })),
    };
    axios
      .post("https://review-dashboard.onrender.com/update-marks", payload)
      .then(() => {
        alert("Marks saved successfully!");
      })
      .catch((err) => console.log("Error saving marks:", err));
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const courseName = students.length > 0 ? students[0].courseName : "Course Name";
    doc.setFontSize(18);
    doc.text(`${courseName} Marks Report`, 14, 22);
    autoTable(doc, {
      head: [["Register Number", "Assess1", "Assess2", "Assess3", "Total"]],
      body: students.map((s) => [
        s.registerNumber,
        s.marks1,
        s.marks2,
        s.marks3,
        s.marks4,
      ]),
      startY: 30,
    });
    doc.save(`${courseName.replace(/[^a-zA-Z0-9]/g, "_")}_Marks_Report.pdf`);
  };

  const handleDownloadSpreadsheet = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      students.map((s) => ({
        "Register Number": s.registerNumber,
        "Assessment 1": s.marks1,
        "Assessment 2": s.marks2,
        "Assessment 3": s.marks3,
        Total: s.marks4,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Marks");
    XLSX.writeFile(workbook, "Student_Marks_Report.xlsx");
  };

  const hasUnseenMessages = async (studentRegisterNumber) => {
    if (!teacherEmail || !studentRegisterNumber) return false;

    const chatKey = teacherEmail < studentRegisterNumber
      ? `${teacherEmail}_${studentRegisterNumber}`
      : `${studentRegisterNumber}_${teacherEmail}`;

    const messagesRef = collection(db, "chats", chatKey, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const lastMessage = querySnapshot.docs[0].data();
      return lastMessage.senderId === studentRegisterNumber;
    }

    return false;
  };

  useEffect(() => {
    const fetchUnseenStatuses = async () => {
      const statuses = {};
      for (const student of students) {
        const hasUnseen = await hasUnseenMessages(student.registerNumber);
        statuses[student.registerNumber] = hasUnseen;
      }
      setUnseenMessagesStatus(statuses);
    };

    if (students.length > 0) {
      fetchUnseenStatuses();
    }
  }, [students, teacherEmail]);

  const openChatWindow = (registerNumber) => {
    setSelectedStudentRegisterNumber(registerNumber);
    setUnseenMessagesStatus((prev) => ({
      ...prev,
      [registerNumber]: false,
    }));
  };

  return (
    <div className="container">
      <h2>
        Enrolled Students for {students.length > 0 ? students[0].courseName : "Loading..."}
      </h2>

      <div className="table-container">
        <table>
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
            {students.length > 0 ? (
              students.map((student, index) => (
                <tr key={index}>
                  <td>{student.registerNumber}</td>
                  <td>
                    <input
                      type="number"
                      value={student.marks1}
                      onChange={(e) => handleMarkChange(index, "marks1", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={student.marks2}
                      onChange={(e) => handleMarkChange(index, "marks2", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={student.marks3}
                      onChange={(e) => handleMarkChange(index, "marks3", e.target.value)}
                    />
                  </td>
                  <td>
                    <input value={student.marks4} readOnly />
                  </td>
                  <td>
                    <img
                      className="chat-icon"
                      src={
                        unseenMessagesStatus[student.registerNumber]
                          ? UNSEEN_MESSAGE_ICON_URL
                          : SEEN_MESSAGE_ICON_URL
                      }
                      alt="Chat"
                      onClick={() => openChatWindow(student.registerNumber)}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="error-message">
                  No students enrolled yet
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="btncontainer">
          <button onClick={handleSaveAllMarks}>Save All Marks</button>
          <button onClick={handleDownloadPDF}>Download PDF</button>
          <button onClick={handleDownloadSpreadsheet}>Download ExcelSheet</button>
        </div>
      </div>

      {selectedStudentRegisterNumber && (
        <ChatWindow
          currentUser={teacherEmail}
          contactUser={selectedStudentRegisterNumber}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
}

export default EnrolledStudents;
