import React, { useState, useEffect } from "react";
import axios from "axios";
import { auth, db } from "../firebase"; // Assuming these are correctly configured
import { onAuthStateChanged } from "firebase/auth";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ChatWindow from "./ChatWindow"; // Adjust path if needed
import * as XLSX from "xlsx";
import { collection, query, orderBy, limit, where, getDocs } from "firebase/firestore";
import '../styles/EnrolledStudents.css'; // Keep existing CSS for fine-tuning

const UNSEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/134/134935.png";
const SEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/2462/2462719.png";

function EnrolledStudents() {
  // State to manage the currently selected program (e.g., 'MCA(R)', 'MTECH(SS)')
  const [selectedProgram, setSelectedProgram] = useState(null);

  const [students, setStudents] = useState([]);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [selectedStudentRegisterNumber, setSelectedStudentRegisterNumber] = useState(null);
  const [unseenMessagesStatus, setUnseenMessagesStatus] = useState({});
  const [latestReviewFiles, setLatestReviewFiles] = useState({});

  // Effect to set teacher email on auth state change
  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setTeacherEmail(user.email);
      }
    });
  }, []);

  // Effect to update document title
  useEffect(() => {
    document.title = "Enrolled Students";
  }, []);

  // Function to fetch students from the backend
  const fetchStudents = () => {
    // Only fetch if a program is selected and teacher email is available
    if (teacherEmail && selectedProgram) {
      axios
        .get(`http://localhost:5000/teacher-courses/${teacherEmail}`) // Assuming this endpoint returns all students for the teacher
        .then((res) => {
          // You might want to filter students here based on selectedProgram
          // if your backend doesn't filter by program.
          // For now, we'll assume the UI simply displays all fetched students
          // after a program is selected. If your backend supports filtering
          // by program, you'd modify the axios call to include `selectedProgram`.
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
        .catch((err) => console.error("Error fetching students:", err));
    } else {
        setStudents([]); // Clear students if no program is selected
    }
  };

  // Function to fetch the latest review files for students
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

  // Fetch students when teacherEmail or selectedProgram changes
  useEffect(() => {
    fetchStudents();
  }, [teacherEmail, selectedProgram]); // Added selectedProgram to dependency array

  // Fetch latest review files when students data changes
  useEffect(() => {
    if (students.length > 0) {
      fetchLatestReviewFiles();
    }
  }, [students]);

  // Set up an interval to periodically fetch students
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStudents();
    }, 5000);
    return () => clearInterval(interval);
  }, [teacherEmail, selectedProgram]); // Added selectedProgram to dependency array

  // Handler to close the chat window
  const handleCloseChat = () => {
    setSelectedStudentRegisterNumber(null);
  };

  // Handler for changes in student marks
  const handleMarkChange = (index, field, value) => {
    const updatedStudents = [...students];
    updatedStudents[index][field] = value;
    setStudents(updatedStudents);
  };

  // Handler to save all marks to the backend
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
      .then(() => alert("Marks saved successfully!")) // Using alert as per original code, consider custom modal for better UX
      .catch((err) => console.error("Error saving marks:", err));
  };

  // Handler to download student marks as PDF
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

  // Handler to download student marks as Excel spreadsheet
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

  // Function to check for unseen messages
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

  // Effect to fetch unseen message statuses
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

  // Handler to open chat window and mark messages as seen
  const openChatWindow = (studentRegisterNumber) => {
    setSelectedStudentRegisterNumber(studentRegisterNumber);
    setUnseenMessagesStatus(prevState => ({
      ...prevState,
      [studentRegisterNumber]: false,
    }));
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 bg-gray-100 font-inter">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Enrolled Students Dashboard
      </h1>

      {/* Program Selection Buttons - Visible only if no program is selected */}
      {!selectedProgram && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 w-full max-w-4xl">
          <button
            onClick={() => setSelectedProgram("MCA(R)")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
          >
            MCA(R)
          </button>
          <button
            onClick={() => setSelectedProgram("MCA(SS)")}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
          >
            MCA(SS)
          </button>
          <button
            onClick={() => setSelectedProgram("MTECH(R)")}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75"
          >
            MTECH(R)
          </button>
          <button
            onClick={() => setSelectedProgram("MTECH(SS)")}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
          >
            MTECH(SS)
          </button>
        </div>
      )}

      {/* Conditional rendering of the student list UI */}
      {selectedProgram && (
        <div className="w-full max-w-6xl bg-white p-6 rounded-lg shadow-xl" role="main">
          <h2 className="text-2xl font-bold mb-4 text-gray-700">
            Students List for {selectedProgram}
          </h2>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal">
                <tr>
                  <th className="py-3 px-6 text-left border-b border-gray-300">Register Number</th>
                  <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 1</th>
                  <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 2</th>
                  <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 3</th>
                  <th className="py-3 px-6 text-center border-b border-gray-300">Average</th>
                  <th className="py-3 px-6 text-center border-b border-gray-300">Zeroth Review</th>
                  <th className="py-3 px-6 text-center border-b border-gray-300">First Review</th>
                  <th className="py-3 px-6 text-center border-b border-gray-300">Second Review</th>
                  <th className="py-3 px-6 text-center border-b border-gray-300">Contact</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm font-light">
                {students.length > 0 ? (
                  students.map((student, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-3 px-6 text-left whitespace-nowrap">{student.registerNumber}</td>
                      <td className="py-3 px-6 text-center">
                        <input
                          type="number"
                          value={student.marks1}
                          onChange={(e) => handleMarkChange(index, "marks1", e.target.value)}
                          className="w-20 p-1 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="py-3 px-6 text-center">
                        <input
                          type="number"
                          value={student.marks2}
                          onChange={(e) => handleMarkChange(index, "marks2", e.target.value)}
                          className="w-20 p-1 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="py-3 px-6 text-center">
                        <input
                          type="number"
                          value={student.marks3}
                          onChange={(e) => handleMarkChange(index, "marks3", e.target.value)}
                          className="w-20 p-1 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="py-3 px-6 text-center">
                        <input
                          value={student.marks4}
                          readOnly
                          className="w-20 p-1 border border-gray-300 rounded-md text-center bg-gray-50 cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3 px-6 text-center">
                        {latestReviewFiles[`${student.registerNumber}_zeroth`] ? (
                          <a
                            href={`http://localhost:5000/${latestReviewFiles[`${student.registerNumber}_zeroth`]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            Download
                          </a>
                        ) : (
                          "No File"
                        )}
                      </td>
                      <td className="py-3 px-6 text-center">
                        {latestReviewFiles[`${student.registerNumber}_first`] ? (
                          <a
                            href={`http://localhost:5000/${latestReviewFiles[`${student.registerNumber}_first`]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            Download
                          </a>
                        ) : (
                          "No File"
                        )}
                      </td>
                      <td className="py-3 px-6 text-center">
                        {latestReviewFiles[`${student.registerNumber}_second`] ? (
                          <a
                            href={`http://localhost:5000/${latestReviewFiles[`${student.registerNumber}_second`]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            Download
                          </a>
                        ) : (
                          "No File"
                        )}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <img
                          src={unseenMessagesStatus[student.registerNumber] ? UNSEEN_MESSAGE_ICON_URL : SEEN_MESSAGE_ICON_URL}
                          alt="Chat Bubble"
                          width="24"
                          height="24"
                          className="cursor-pointer mx-auto"
                          onClick={() => openChatWindow(student.registerNumber)}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="py-4 text-center text-gray-500">
                      No students enrolled yet for this program.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <button
              onClick={handleSaveAllMarks}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
            >
              Save All Marks
            </button>
            <button
              onClick={handleDownloadPDF}
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75"
            >
              Download PDF
            </button>
            <button
              onClick={handleDownloadSpreadsheet}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
            >
              Download Excel Sheet
            </button>
          </div>

          {/* Back button to go back to program selection */}
          <div className="flex justify-center mt-8">
            <button
              onClick={() => {
                setSelectedProgram(null); // Reset selected program
                setStudents([]); // Clear current students
                setUnseenMessagesStatus({}); // Clear chat statuses
                setLatestReviewFiles({}); // Clear review files
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
            >
              Select Another Program
            </button>
          </div>
        </div>
      )}

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
