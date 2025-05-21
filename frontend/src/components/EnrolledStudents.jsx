// TeacherCourses.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ChatWindow from "./ChatWindow"; // Adjust path if needed
import * as XLSX from "xlsx";
import { collection, query, orderBy, limit, where, getDocs } from "firebase/firestore";
import '../styles/EnrolledStudents.css';

const UNSEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/134/134935.png";
const SEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/2462/2462719.png";

function EnrolledStudents() {
  const [students, setStudents] = useState([]);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [selectedStudentRegisterNumber, setSelectedStudentRegisterNumber] = useState(null);
  const [unseenMessagesStatus, setUnseenMessagesStatus] = useState({});
  const [latestReviewFiles, setLatestReviewFiles] = useState({});

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setTeacherEmail(user.email);
      }
    });
  }, []);

  useEffect(() => {
    document.title = "Enrolled Students"; 
  }, []);

  const fetchStudents = () => {
    if (teacherEmail) {
      axios
        .get(`http://localhost:5000/teacher-courses/${teacherEmail}`)
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
          updatedStudents.sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
          setStudents(updatedStudents);
        })
        .catch((err) => console.log(err));
    }
  };

  const fetchLatestReviewFiles = async () => {
    const files = {};
    for (const student of students) {
      for (const reviewType of ["zeroth", "first", "second"]) {
        try {
          const response = await axios.get(`http://localhost:5000/get-latest-review/${student.registerNumber}/${reviewType}`);
          if (response.data.filePath) {
            files[`${student.registerNumber}_${reviewType}`] = response.data.filePath;
          }
        } catch (error) {
          console.error(`Error fetching ${reviewType} review for ${student.registerNumber}:`, error);
        }
      }
    }
    setLatestReviewFiles(files);
  };

  useEffect(() => {
    fetchStudents();
  }, [teacherEmail]);

  useEffect(() => {
    if (students.length > 0) {
      fetchLatestReviewFiles();
    }
  }, [students]);

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
      .post("http://localhost:5000/update-marks", payload)
      .then(() => alert("Marks saved successfully!"))
      .catch((err) => console.log("Error saving marks:", err));
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const courseName = students.length > 0 ? students[0].courseName : "Course Name Not Available";
    doc.setFontSize(18);
    doc.text(`${courseName} Marks Report`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    const tableColumn = ["Register Number", "Assess1", "Assess2", "Assess3", "Total"];
    const tableRows = students.map((student) => [
      student.registerNumber,
      student.marks1,
      student.marks2,
      student.marks3,
      student.marks4,
    ]);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });
    doc.save(`${courseName.replace(/[^a-zA-Z0-9]/g, '_')}_Marks_Report.pdf`);
  };

  const handleDownloadSpreadsheet = () => {
    const worksheet = XLSX.utils.json_to_sheet(students.map(student => ({
      "Register Number": student.registerNumber,
      "Assessment 1": student.marks1,
      "Assessment 2": student.marks2,
      "Assessment 3": student.marks3,
      "Total": student.marks4,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Marks");
    XLSX.writeFile(workbook, "Student_Marks_Report.xlsx");
  };

  const hasUnseenMessages = async (studentRegisterNumber) => {
    if (!teacherEmail || !studentRegisterNumber) return false;
    const chatKey = teacherEmail < studentRegisterNumber ? `${teacherEmail}_${studentRegisterNumber}` : `${studentRegisterNumber}_${teacherEmail}`;
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

  const openChatWindow = (studentRegisterNumber) => {
    setSelectedStudentRegisterNumber(studentRegisterNumber);
    setUnseenMessagesStatus(prevState => ({
      ...prevState,
      [studentRegisterNumber]: false,
    }));
  };

  return (
    <div>
      <h2>Enrolled Students for {students.length > 0 ? students[0].courseName : "Loading..."}</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Register Number</th>
            <th>Assessment 1</th>
            <th>Assessment 2</th>
            <th>Assessment 3</th>
            <th>Average</th>
            <th>Zeroth Review</th>
            <th>First Review</th>
            <th>Second Review</th>
            <th>Contact</th>
          </tr>
        </thead>
        <tbody>
          {students.length > 0 ? (
            students.map((student, index) => (
              <tr key={index}>
                <td>{student.registerNumber}</td>
                <td><input type="number" value={student.marks1} onChange={(e) => handleMarkChange(index, "marks1", e.target.value)} /></td>
                <td><input type="number" value={student.marks2} onChange={(e) => handleMarkChange(index, "marks2", e.target.value)} /></td>
                <td><input type="number" value={student.marks3} onChange={(e) => handleMarkChange(index, "marks3", e.target.value)} /></td>
                <td><input value={student.marks4} readOnly /></td>
                <td>{latestReviewFiles[`${student.registerNumber}_zeroth`] ? <a href={`http://localhost:5000/${latestReviewFiles[`${student.registerNumber}_zeroth`]}`} target="_blank" rel="noopener noreferrer">Download</a> : "No File"}</td>
                <td>{latestReviewFiles[`${student.registerNumber}_first`] ? <a href={`http://localhost:5000/${latestReviewFiles[`${student.registerNumber}_first`]}`} target="_blank" rel="noopener noreferrer">Download</a> : "No File"}</td>
                <td>{latestReviewFiles[`${student.registerNumber}_second`] ? <a href={`http://localhost:5000/${latestReviewFiles[`${student.registerNumber}_second`]}`} target="_blank" rel="noopener noreferrer">Download</a> : "No File"}</td>
                <td>
                  <img
                    src={unseenMessagesStatus[student.registerNumber] ? UNSEEN_MESSAGE_ICON_URL : SEEN_MESSAGE_ICON_URL}
                    alt="Chat Bubble"
                    width="20"
                    style={{ cursor: "pointer", verticalAlign: "middle" }}
                    onClick={() => openChatWindow(student.registerNumber)}
                  />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="9">No students enrolled yet</td>
            </tr>
          )}
        </tbody>
      </table>

      <button onClick={handleSaveAllMarks} style={{ marginTop: "10px" }}>Save All Marks</button>
      <button onClick={handleDownloadPDF} style={{ marginTop: "10px", marginLeft: "10px" }}>Download PDF</button>
      <button onClick={handleDownloadSpreadsheet} style={{ marginTop: "10px", marginLeft: "10px" }}>Download ExcelSheet</button>

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
