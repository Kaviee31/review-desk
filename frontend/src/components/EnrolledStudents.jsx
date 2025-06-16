import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ChatWindow from "./ChatWindow";
import * as XLSX from "xlsx";
import { collection, query, orderBy, limit, where, getDocs, doc, getDoc } from "firebase/firestore";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/EnrolledStudents.css';

const UNSEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/134/134935.png";
const SEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/2462/2462719.png";

function EnrolledStudents() {
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [students, setStudents] = useState([]);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherUid, setTeacherUid] = useState(null);
  const [selectedStudentRegisterNumber, setSelectedStudentRegisterNumber] = useState(null);
  const [unseenMessagesStatus, setUnseenMessagesStatus] = useState({});
  const [latestReviewFiles, setLatestReviewFiles] = useState({});

  // States for the student review marks modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentStudentForReview, setCurrentStudentForReview] = useState(null); // The student object whose reviews are being viewed
  const [coordinatorReviewStructure, setCoordinatorReviewStructure] = useState([]); // Review items defined by coordinator (contains max marks and descriptions)
  const [studentReviewMarks, setStudentReviewMarks] = useState([]); // Marks entered by teacher for current student
  const [loadingReviewData, setLoadingReviewData] = useState(false); // Loading state for review modal data
  const [savingReviewMarks, setSavingReviewMarks] = useState(false); // Saving state for review marks

  const allPrograms = ["MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(SS)"];
  const API_BASE_URL = "http://localhost:5000";

  // Effect to set teacher email and UID on auth state change
  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setTeacherEmail(user.email);
        setTeacherUid(user.uid);
      }
    });
  }, []);

  useEffect(() => {
    document.title = "Enrolled Students";
  }, []);

  // Function to fetch students from the backend
  const fetchStudents = async () => {
    if (teacherEmail && selectedProgram) {
      try {
        const response = await axios.get(`${API_BASE_URL}/teacher-students/${teacherEmail}?courseName=${selectedProgram}`);
        
        // Map data from backend to frontend state structure
        const updatedStudents = response.data.map((student) => ({
          ...student,
          // Ensure Assessment fields are numeric, default to 0 if null/undefined
          marks1: student.Assessment1 || 0,
          marks2: student.Assessment2 || 0,
          marks3: student.Assessment3 || 0,
          marks4: student.Total || 0,
          extraColumn: student.Contact || "",
          registerNumber: student.registerNumber,
          courseName: student.courseName,
          reviewsAssessment: student.reviewsAssessment || [],
        }));
        updatedStudents.sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
        setStudents(updatedStudents);
      } catch (err) {
        console.error(`Error fetching students for ${selectedProgram}:`, err);
        setStudents([]);
      }
    } else {
      setStudents([]);
    }
  };

  // Function to fetch the latest review files for students (PDFs etc.)
  const fetchLatestReviewFiles = async () => {
    const files = {};
    for (const student of students) {
      for (const reviewType of ["zeroth", "first", "second"]) {
        try {
          const response = await axios.get(`${API_BASE_URL}/get-latest-review/${student.registerNumber}/${reviewType}`);
          if (response.data && response.data.filePath) {
            files[`${student.registerNumber}_${reviewType}`] = response.data.filePath;
          }
        } catch (error) {
          // console.error(`Error fetching ${reviewType} review for ${student.registerNumber}:`, error);
        }
      }
    }
    setLatestReviewFiles(files);
  };

  useEffect(() => {
    fetchStudents();
  }, [teacherEmail, selectedProgram]);

  useEffect(() => {
    if (students.length > 0) {
      fetchLatestReviewFiles();
    } else {
      setLatestReviewFiles({});
    }
  }, [students]);

  // Polling for students and messages (consider using Firestore real-time listeners for chat for better efficiency)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStudents();
    }, 5000);
    return () => clearInterval(interval);
  }, [teacherEmail, selectedProgram]);

  const handleCloseChat = () => {
    setSelectedStudentRegisterNumber(null);
  };

  // This handles changes in the main table's Assessment fields directly
  const handleMarkChange = (index, field, value) => {
    const updatedStudents = [...students];
    const numericValue = Number(value);
    updatedStudents[index][field] = isNaN(numericValue) ? 0 : numericValue; // Ensure numeric value
    updatedStudents[index].marks4 = Math.ceil((
        (Number(updatedStudents[index].marks1) || 0) +
        (Number(updatedStudents[index].marks2) || 0) +
        (Number(updatedStudents[index].marks3) || 0)
      ) / 3);
    setStudents(updatedStudents);
  };

  // Handler to save all marks to the backend (for Assessment1,2,3 from main table)
  const handleSaveAllMarks = async () => {
    try {
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
      await axios.post(`${API_BASE_URL}/update-marks`, payload);
      toast.success("Assessment marks saved successfully!");
    } catch (err) {
      console.error("Error saving assessment marks:", err);
      toast.error(err.response?.data?.error || "Error saving assessment marks");
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const courseName = selectedProgram || "Students";
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
    XLSX.writeFile(workbook, `${selectedProgram ? selectedProgram + '_' : ''}Student_Marks_Report.xlsx`);
  };

  const hasUnseenMessages = async (studentRegisterNumber) => {
    if (!teacherEmail || !studentRegisterNumber) return false;
    const chatKey = teacherEmail < studentRegisterNumber ? `${teacherEmail}_${studentRegisterNumber}` : `${studentRegisterNumber}_${teacherEmail}`;
    const messagesRef = collection(db, "chats", chatKey, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const lastMessage = querySnapshot.docs[0].data();
        return lastMessage.senderId === studentRegisterNumber;
      }
    } catch (error) {
      console.error("Error checking unseen messages:", error);
    }
    return false;
  };

  useEffect(() => {
    const fetchUnseenStatuses = async () => {
      const statuses = {};
      if (students.length > 0) {
        for (const student of students) {
          const hasUnseen = await hasUnseenMessages(student.registerNumber);
          statuses[student.registerNumber] = hasUnseen;
        }
      }
      setUnseenMessagesStatus(statuses);
    };
    fetchUnseenStatuses();
  }, [students, teacherEmail]);

  const openChatWindow = (studentRegNo) => {
    setSelectedStudentRegisterNumber(studentRegNo);
    setUnseenMessagesStatus(prevState => ({
      ...prevState,
      [studentRegNo]: false,
    }));
  };

  // Function to handle opening the review modal
  const handleOpenReviewModal = async (student) => {
    setCurrentStudentForReview(student);
    setShowReviewModal(true);
    setLoadingReviewData(true);
    setStudentReviewMarks([]); // Clear previous marks

    try {
      // 1. Find the UID of the coordinator for the selectedProgram
      const usersRef = collection(db, "users");
      const coordinatorQuery = query(usersRef, where("profession", "==", "Coordinator"), where("department", "==", selectedProgram));
      const coordinatorSnapshot = await getDocs(coordinatorQuery);

      let programCoordinatorUid = null;
      if (!coordinatorSnapshot.empty) {
        programCoordinatorUid = coordinatorSnapshot.docs[0].id;
      } else {
        toast.warn(`No coordinator found for ${selectedProgram}. Cannot load review items.`);
        setLoadingReviewData(false);
        return; // Exit early if no coordinator is found
      }

      // 2. Fetch the coordinator's defined review structure for this program
      const coordinatorReviewResponse = await axios.get(`${API_BASE_URL}/coordinator-reviews/${programCoordinatorUid}/${selectedProgram}`);
      const coordinatorData = coordinatorReviewResponse.data.reviewData || [];
      setCoordinatorReviewStructure(coordinatorData);

      // 3. Fetch the student's existing marks for these review items
      const studentMarksResponse = await axios.get(`${API_BASE_URL}/student-review-marks/${student.registerNumber}/${student.courseName}`);
      const existingStudentMarks = studentMarksResponse.data.reviewsAssessment || [];

      // Combine coordinator's structure with student's existing marks
      const combinedReviewData = coordinatorData.map(coordItem => {
        const existingMark = existingStudentMarks.find(studentItem =>
          // Use original r1_desc for matching, assuming it's the primary identifier for a review row
          studentItem.description === coordItem.r1_desc
        );

        return {
          r1_item_desc: coordItem.r1_desc, // Specific description for R1 item
          r2_item_desc: coordItem.r2_desc, // Specific description for R2 item
          r3_item_desc: coordItem.r3_desc, // Specific description for R3 item
          coord_r1_max: Number(coordItem.r1_mark) || 0, // Coordinator's set max mark for R1
          coord_r2_max: Number(coordItem.r2_mark) || 0, // Coordinator's set max mark for R2
          coord_r3_max: Number(coordItem.r3_mark) || 0, // Coordinator's set max mark for R3
          r1_mark: existingMark ? existingMark.r1_mark : 0,
          r2_mark: existingMark ? existingMark.r2_mark : 0,
          r3_mark: existingMark ? existingMark.r3_mark : 0,
        };
      });
      setStudentReviewMarks(combinedReviewData);

    } catch (error) {
      console.error("Error loading review data for student:", error);
      toast.error(`Failed to load review details: ${error.message}`);
      setCoordinatorReviewStructure([]);
      setStudentReviewMarks([]);
    } finally {
      setLoadingReviewData(false);
    }
  };

  // Function to handle changes in student's review item marks
  const handleStudentReviewMarkChange = (index, reviewType, value) => {
    setStudentReviewMarks(prevMarks => {
      const updatedMarks = [...prevMarks];
      updatedMarks[index][reviewType] = Number(value);
      return updatedMarks;
    });
  };

  // Function to save student's review marks and update Assessment1, 2, 3
  const handleSaveStudentReviewMarks = async () => {
    if (!currentStudentForReview || !selectedProgram || !teacherUid) {
      toast.error("Cannot save: Missing student, program, or teacher info.");
      return;
    }
    setSavingReviewMarks(true);
    try {
      const payload = {
        registerNumber: currentStudentForReview.registerNumber,
        courseName: selectedProgram,
        reviewsAssessment: studentReviewMarks.map((item, index) => ({
            // When saving, use the original r1_desc from coordinatorReviewStructure as identifier for backend,
            // as 'description' in the database is based on that.
            description: coordinatorReviewStructure[index]?.r1_desc || item.r1_item_desc,
            r1_mark: item.r1_mark,
            r2_mark: item.r2_mark,
            r3_mark: item.r3_mark,
        }))
      };

      // 1. Save the detailed review marks to the student's enrollment
      await axios.post(`${API_BASE_URL}/student-review-marks`, payload);

      // --- Calculations for Assessment1, Assessment2, Assessment3 (normalized to 100) ---
      let totalAwardedR1Marks = 0;
      let totalPossibleR1Marks = 0;
      let totalAwardedR2Marks = 0;
      let totalPossibleR2Marks = 0;
      let totalAwardedR3Marks = 0;
      let totalPossibleR3Marks = 0;

      studentReviewMarks.forEach((item, index) => {
        totalAwardedR1Marks += Number(item.r1_mark) || 0;
        totalAwardedR2Marks += Number(item.r2_mark) || 0;
        totalAwardedR3Marks += Number(item.r3_mark) || 0;

        // Use coordinatorReviewStructure for max marks as it contains the original structure
        const coordMaxItem = coordinatorReviewStructure[index];
        totalPossibleR1Marks += Number(coordMaxItem?.r1_mark) || 0;
        totalPossibleR2Marks += Number(coordMaxItem?.r2_mark) || 0;
        totalPossibleR3Marks += Number(coordMaxItem?.r3_mark) || 0;
      });

      // Normalize Assessment 1
      let normalizedAssessment1 = 0;
      if (totalPossibleR1Marks > 0) {
        normalizedAssessment1 = (totalAwardedR1Marks / totalPossibleR1Marks) * 100;
      }
      normalizedAssessment1 = Math.round(normalizedAssessment1);

      // Normalize Assessment 2
      let normalizedAssessment2 = 0;
      if (totalPossibleR2Marks > 0) {
        normalizedAssessment2 = (totalAwardedR2Marks / totalPossibleR2Marks) * 100;
      }
      normalizedAssessment2 = Math.round(normalizedAssessment2);

      // Normalize Assessment 3
      let normalizedAssessment3 = 0;
      if (totalPossibleR3Marks > 0) {
        normalizedAssessment3 = (totalAwardedR3Marks / totalPossibleR3Marks) * 100;
      }
      normalizedAssessment3 = Math.round(normalizedAssessment3);

      // 2. Prepare payload to update main Assessment1, 2, 3 and Total in the student's enrollment
      const newTotalAverage = Math.ceil((normalizedAssessment1 + normalizedAssessment2 + normalizedAssessment3) / 3);

      const assessmentUpdatePayload = {
        students: [{
          registerNumber: currentStudentForReview.registerNumber,
          courseName: selectedProgram,
          Assessment1: normalizedAssessment1,
          Assessment2: normalizedAssessment2,
          Assessment3: normalizedAssessment3,
          Total: newTotalAverage,
        }]
      };

      // 3. Send update for Assessment1, 2, 3 and Total to the backend
      await axios.post(`${API_BASE_URL}/update-marks`, assessmentUpdatePayload);

      toast.success("Student review marks and Assessments updated successfully!");
      setShowReviewModal(false); // Close modal on successful save
      fetchStudents(); // Re-fetch the student list to update the main table
    } catch (error) {
      console.error("Error saving student review marks:", error);
      toast.error(`Failed to save student review marks: ${error.response?.data?.error || error.message}`);
    } finally {
      setSavingReviewMarks(false);
    }
  };


  // Calculate totals for the modal's footer
  const calculateModalTotals = () => {
    let totalAwardedR1 = 0;
    let totalAwardedR2 = 0;
    let totalAwardedR3 = 0;

    studentReviewMarks.forEach(item => {
      totalAwardedR1 += Number(item.r1_mark) || 0;
      totalAwardedR2 += Number(item.r2_mark) || 0;
      totalAwardedR3 += Number(item.r3_mark) || 0;
    });

    return { totalAwardedR1, totalAwardedR2, totalAwardedR3 };
  };

  const { totalAwardedR1, totalAwardedR2, totalAwardedR3 } = calculateModalTotals();

  // NEW: Function to download the specific student's review marks as PDF
  const handleDownloadStudentReviewPDF = () => {
    if (!currentStudentForReview || studentReviewMarks.length === 0) {
      toast.error("No review data available to download for this student.");
      return;
    }

    const doc = new jsPDF();
    const studentName = currentStudentForReview.studentName;
    const registerNumber = currentStudentForReview.registerNumber;
    const programName = selectedProgram;
    const currentDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY format

    // Resembling the "Semester Fee Receipt" structure
    doc.setFont('helvetica'); // Use a standard font
    doc.setFontSize(10);
    doc.text('PROGRESS THROUGH KNOWLEDGE', 14, 15);

    doc.setFontSize(14);
    doc.text('ANNA UNIVERSITY', 14, 25);
    doc.text('STUDENT REVIEW MARKS REPORT', 14, 32);

    doc.setFontSize(10);
    doc.text(`Roll.No: ${registerNumber}`, 14, 45);
    doc.text(`Name: ${studentName}`, 14, 55);
    doc.text(`Program: ${programName}`, 14, 50);
    doc.text(`Report Generated On: ${currentDate}`, 14, 60);

    const tableColumn = [
      "Review Item (R1)", "R1 Max", "R1 Awarded",
      "Review Item (R2)", "R2 Max", "R2 Awarded",
      "Review Item (R3)", "R3 Max", "R3 Awarded"
    ];

    const tableRows = studentReviewMarks.map(item => [
      item.r1_item_desc || '', // Ensure no 'undefined' in PDF
      item.coord_r1_max.toString(),
      item.r1_mark.toString(),
      item.r2_item_desc || '',
      item.coord_r2_max.toString(),
      item.r2_mark.toString(),
      item.r3_item_desc || '',
      item.coord_r3_max.toString(),
      item.r3_mark.toString()
    ]);

    // Add totals row to the tableRows for PDF
    tableRows.push([
      { content: "Total Awarded Marks (R1):", colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totalAwardedR1.toString(), styles: { fontStyle: 'bold', halign: 'center' } },
      { content: "Total Awarded Marks (R2):", colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totalAwardedR2.toString(), styles: { fontStyle: 'bold', halign: 'center' } },
      { content: "Total Awarded Marks (R3):", colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totalAwardedR3.toString(), styles: { fontStyle: 'bold', halign: 'center' } }
    ]);


    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 70, // Adjust start position based on new header info
      theme: 'grid', // Add grid theme for better visual separation
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
      footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
      didDrawPage: function (data) {
        // Footer (optional: add page numbers or custom text)
        let str = "Page " + doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });

    doc.save(`${studentName.replace(/[^a-zA-Z0-9]/g, '_')}_${registerNumber}_Review_Marks.pdf`);
    toast.success("Student review marks PDF downloaded successfully!");
  };


  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 bg-gray-100 font-inter">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Enrolled Students Dashboard
      </h1>

      {!selectedProgram && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 w-full max-w-4xl">
          {allPrograms.map((program) => (
            <button
              key={program}
              onClick={() => setSelectedProgram(program)}
              className={`font-semibold py-4 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75
                ${program === "MCA(R)" ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500" :
                  program === "MCA(SS)" ? "bg-green-600 hover:bg-green-700 focus:ring-green-500" :
                    program === "MTECH(R)" ? "bg-purple-600 hover:bg-purple-700 focus:ring-purple-500" :
                      "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                }
                text-white
              `}
            >
              {program}
            </button>
          ))}
        </div>
      )}

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
                  <th className="py-3 px-6 text-left border-b border-gray-300">Student Name</th>
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
                    <tr key={student.registerNumber} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-3 px-6 text-left whitespace-nowrap">
                        <span
                          className="text-blue-600 hover:underline cursor-pointer font-medium"
                          onClick={() => handleOpenReviewModal(student)}
                        >
                          {student.registerNumber}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-left whitespace-nowrap">{student.studentName}</td>
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
                            href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_zeroth`]}`}
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
                            href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_first`]}`}
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
                            href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_second`]}`}
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
                    <td colSpan="10" className="py-4 text-center text-gray-500">
                      No students enrolled yet for this program or your assigned program.
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
                setSelectedProgram(null);
                setStudents([]);
                setUnseenMessagesStatus({});
                setLatestReviewFiles({});
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

      {/* Review Marks Modal */}
      {showReviewModal && currentStudentForReview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative"> {/* Increased max-w-4xl */}
            <h3 className="text-2xl font-bold mb-4 text-gray-800">
              Review Marks for {currentStudentForReview.studentName} ({currentStudentForReview.registerNumber})
            </h3>
            <p className="text-gray-600 mb-4">
              Program: {selectedProgram}
            </p>

            {loadingReviewData ? (
              <div className="flex justify-center items-center h-32">
                <p className="text-lg text-blue-600">Loading review items...</p>
              </div>
            ) : (
              <>
                {coordinatorReviewStructure.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-sm">
                      <thead className="bg-gray-100 text-gray-700 uppercase text-sm leading-normal">
                        <tr>
                          {/* Reordered and clarified headers */}
                          <th className="py-2 px-4 text-left border-b border-gray-300">Review Item (R1)</th>
                          <th className="py-2 px-4 text-center border-b border-gray-300">R1 Max</th>
                          <th className="py-2 px-4 text-center border-b border-gray-300">R1 Awarded</th>
                          <th className="py-2 px-4 text-left border-b border-gray-300">Review Item (R2)</th>
                          <th className="py-2 px-4 text-center border-b border-gray-300">R2 Max</th>
                          <th className="py-2 px-4 text-center border-b border-gray-300">R2 Awarded</th>
                          <th className="py-2 px-4 text-left border-b border-gray-300">Review Item (R3)</th>
                          <th className="py-2 px-4 text-center border-b border-gray-300">R3 Max</th>
                          <th className="py-2 px-4 text-center border-b border-gray-300">R3 Awarded</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-700 text-sm">
                        {studentReviewMarks.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            {/* Display individual review item descriptions and marks */}
                            <td className="py-2 px-4 text-left">{item.r1_item_desc}</td>
                            <td className="py-2 px-4 text-center font-bold text-gray-800">{item.coord_r1_max}</td>
                            <td className="py-2 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max={item.coord_r1_max}
                                value={item.r1_mark}
                                onChange={(e) => handleStudentReviewMarkChange(index, "r1_mark", e.target.value)}
                                className="w-24 p-1 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                              />
                            </td>
                            <td className="py-2 px-4 text-left">{item.r2_item_desc}</td>
                            <td className="py-2 px-4 text-center font-bold text-gray-800">{item.coord_r2_max}</td>
                            <td className="py-2 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max={item.coord_r2_max}
                                value={item.r2_mark}
                                onChange={(e) => handleStudentReviewMarkChange(index, "r2_mark", e.target.value)}
                                className="w-24 p-1 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                              />
                            </td>
                            <td className="py-2 px-4 text-left">{item.r3_item_desc}</td>
                            <td className="py-2 px-4 text-center font-bold text-gray-800">{item.coord_r3_max}</td>
                            <td className="py-2 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max={item.coord_r3_max}
                                value={item.r3_mark}
                                onChange={(e) => handleStudentReviewMarkChange(index, "r3_mark", e.target.value)}
                                className="w-24 p-1 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* NEW: Total Row in Modal Footer */}
                      <tfoot className="bg-gray-100 text-gray-800 uppercase text-sm leading-normal font-semibold">
                        <tr>
                          <td className="py-2 px-4 text-right border-t border-gray-300" colSpan="2">Total Awarded Marks (R1):</td>
                          <td className="py-2 px-4 text-center border-t border-gray-300">{totalAwardedR1}</td>
                          <td className="py-2 px-4 text-right border-t border-gray-300" colSpan="2">Total Awarded Marks (R2):</td>
                          <td className="py-2 px-4 text-center border-t border-gray-300">{totalAwardedR2}</td>
                          <td className="py-2 px-4 text-right border-t border-gray-300" colSpan="2">Total Awarded Marks (R3):</td>
                          <td className="py-2 px-4 text-center border-t border-gray-300">{totalAwardedR3}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No review items defined by the coordinator for this program.</p>
                )}
              </>
            )}

            {savingReviewMarks && (
              <div className="flex justify-center mt-4">
                <p className="text-blue-600">Saving marks...</p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowReviewModal(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStudentReviewMarks}
                disabled={savingReviewMarks || loadingReviewData}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingReviewMarks ? "Saving..." : "Save Marks"}
              </button>
              <button
                onClick={handleDownloadStudentReviewPDF}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75"
              >
                Download as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnrolledStudents;
