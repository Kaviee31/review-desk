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
import ZerothReviewForm from './ZerothReviewForm';
import '../styles/EnrolledStudents.css';

const UNSEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/134/134935.png";
const SEEN_MESSAGE_ICON_URL = "https://cdn-icons-png.flaticon.com/512/2462/2462719.png";

function EnrolledStudents() {
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [students, setStudents] = useState([]); // For PG students
  const [ugProjects, setUgProjects] = useState([]); // State for UG projects (main table)
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherUid, setTeacherUid] = useState(null);
  const [selectedStudentRegisterNumber, setSelectedStudentRegisterNumber] = useState(null);
  const [unseenMessagesStatus, setUnseenMessagesStatus] = useState({});
   const [loading, setLoading] = useState(true);
    const [zerothReviewComments, setZerothReviewComments] = useState({});
  const [newComments, setNewComments] = useState({});
  // Modified to store objects with pdfPath, pptPath, otherPath, and uploadedAt
  const [latestReviewFiles, setLatestReviewFiles] = useState({});
  const [studentCounts, setStudentCounts] = useState({});
 const [selectedStudent, setSelectedStudent] = useState(null);
  const [zerothReviews, setZerothReviews] = useState({});
  // States for the student review marks modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentStudentForReview, setCurrentStudentForReview] = useState(null); // The student object whose reviews are being viewed
  const [coordinatorReviewStructure, setCoordinatorReviewStructure] = useState([]); // Review items defined by coordinator (contains max marks and descriptions)
  const [studentReviewMarks, setStudentReviewMarks] = useState([]); // Marks entered by teacher for current student
  const [loadingReviewData, setLoadingReviewData] = useState(false); // Loading state for review modal data
  const [savingReviewMarks, setSavingReviewMarks] = useState(false); // Saving state for review marks

  // State for managing different views in UG programs
  // 'projects': shows the list of projects
  // 'students_in_project': shows students within a selected project
  const [ugCurrentView, setUgCurrentView] = useState('projects');
  const [selectedProject, setSelectedProject] = useState(null); // The project object selected from the projects table
  const [studentsInSelectedProject, setStudentsInSelectedProject] = useState([]); // Students belonging to the selected project

    const [vivaMarks, setVivaMarks] = useState({ guide: 0, panel: 0, external: 0 });
  const [vivaTotalAwarded, setVivaTotalAwarded] = useState(0);

  // Review Deadlines State
  const [reviewDeadlines, setReviewDeadlines] = useState({
    zerothReviewDeadline: null,
    firstReviewDeadline: null,
    secondReviewDeadline: null,
    thirdReviewDeadline: null, // NEW: Third review deadline
  });

  // Ensure these program names are consistent across AdminDashboard and CoordinatorDashboard
  const pgPrograms = ["MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(SS)"];
  const ugPrograms = ["B.TECH(IT)", "B.TECH(IT) SS"];
  const allPrograms = [...pgPrograms, ...ugPrograms];
  const API_BASE_URL = "http://localhost:5000";

  // Effect to set teacher email and UID on auth state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setTeacherEmail(user.email);
        setTeacherUid(user.uid);
      } else {
        setTeacherEmail("");
        setTeacherUid(null);
      }
    });
    return () => unsubscribe(); // Cleanup subscription
  }, []);


  useEffect(() => {
  const fetchCounts = async () => {
    try {
      const counts = {};
      for (const program of allPrograms) {
        const response = await axios.get(`${API_BASE_URL}/teacher-students/${teacherEmail}?courseName=${program}`);
        counts[program] = response.data.length;
      }
      setStudentCounts(counts);
    } catch (err) {
      console.error("Error fetching student counts", err);
    }
  };

  if (teacherEmail) {
    fetchCounts();
  }
}, [teacherEmail]);

  useEffect(() => {
    document.title = "Enrolled Students";
  }, []);

  // Function to fetch review deadlines
  const fetchReviewDeadlines = useCallback(async (courseName) => {
    if (!courseName) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/get-review-dates?courseName=${courseName}`);
      setReviewDeadlines({
        zerothReviewDeadline: response.data?.zerothReviewDeadline || null,
        firstReviewDeadline: response.data?.firstReviewDeadline || null,
        secondReviewDeadline: response.data?.secondReviewDeadline || null,
        thirdReviewDeadline: response.data?.thirdReviewDeadline || null, // NEW: Fetch third review deadline
      });
    } catch (error) {
      console.error("Error fetching review deadlines:", error);
    }
  }, [API_BASE_URL]);

useEffect(() => {
    if (selectedProgram) {
      fetchStudents();
    }
  }, [selectedProgram]);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/students?program=${selectedProgram}`);
      const studentData = res.data;
      setStudents(studentData);
      fetchZerothReviewComments(studentData);
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  };

  const fetchZerothReviewComments = async (students) => {
    try {
      const registerNumbers = students.map((s) => s.registerNumber);
      const res = await axios.post(`${API_BASE_URL}/zeroth-review/comments`, { registerNumbers });
      const commentsMap = res.data.reduce((acc, item) => {
        acc[item.registerNumber] = item.comment;
        return acc;
      }, {});
      setZerothReviewComments(commentsMap);
    } catch (err) {
      console.error("Error fetching zeroth review comments:", err);
    }
  };

  const handleCommentChange = (registerNumber, value) => {
    setNewComments((prev) => ({ ...prev, [registerNumber]: value }));
  };

  const handleSubmitComment = async (registerNumber) => {
    try {
      const comment = newComments[registerNumber];
      if (!comment.trim()) return;

      await axios.post(`${API_BASE_URL}/zeroth-review/submit`, {
        registerNumber,
        comment,
        teacherEmail,
      });

      setZerothReviewComments((prev) => ({ ...prev, [registerNumber]: comment }));
      setNewComments((prev) => ({ ...prev, [registerNumber]: "" }));
    } catch (err) {
      console.error("Error submitting zeroth review comment:", err);
    }
  };
  useEffect(() => {
    if (selectedProgram) {
      fetchReviewDeadlines(selectedProgram);
    }
  }, [selectedProgram, fetchReviewDeadlines]);


  // Function to fetch students from the backend (for PG courses)
  const fetchPgStudents = async () => {
    if (teacherEmail && selectedProgram) {
      try {
        const response = await axios.get(`${API_BASE_URL}/teacher-students/${teacherEmail}?courseName=${selectedProgram}`);
        const updatedStudents = response.data.map((student) => ({
          ...student,
          marks1: student.Assessment1 || 0,
          marks2: student.Assessment2 || 0,
          marks3: student.Assessment3 || 0,
          marks4: student.Total || 0,
          contact: student.contact || "",
          // Ensure reviewsAssessment is always an array, even if null/undefined from backend
          reviewsAssessment: student.reviewsAssessment || [],
        }));
        updatedStudents.sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
        setStudents(updatedStudents);
        console.log("Fetched PG Students:", updatedStudents);
      } catch (err) {
        console.error(`Error fetching students for ${selectedProgram}:`, err);
        setStudents([]);
      }
    } else {
      setStudents([]);
    }
  };

  // Function to fetch UG projects from the backend
  const fetchUgProjects = async () => {
    if (teacherEmail && selectedProgram) {
      try {
        const response = await axios.get(`${API_BASE_URL}/teacher-ug-projects/${teacherEmail}/${selectedProgram}`);
        setUgProjects(response.data);
        console.log("Fetched UG Projects:", response.data);
      } catch (err) {
        console.error(`Error fetching UG projects for ${selectedProgram}:`, err);
        setUgProjects([]);
      }
    } else {
      setUgProjects([]);
    }
  };

  useEffect(() => {
    if (teacherEmail && selectedProgram) { // Only fetch if teacherEmail is available
      if (pgPrograms.includes(selectedProgram)) {
        fetchPgStudents();
        setUgProjects([]); // Clear UG projects if PG is selected
      } else if (ugPrograms.includes(selectedProgram)) {
        fetchUgProjects();
        setStudents([]); // Clear PG students if UG is selected
        setUgCurrentView('projects'); // Default to projects view for UG
      }
    } else {
      setStudents([]);
      setUgProjects([]);
    }
  }, [teacherEmail, selectedProgram]);

  // Modified fetchLatestReviewFiles to handle multiple file types and uploadedAt
  const fetchLatestReviewFiles = async (studentList) => {
    const files = {};
    // Include "third" in the reviewType array
    for (const student of studentList) {
      for (const reviewType of ["zeroth", "first", "second", "third"]) { // MODIFIED: Added "third"
        try {
          // The backend now returns an object with pdfPath, pptPath, otherPath, and uploadedAt
          const response = await axios.get(`${API_BASE_URL}/get-latest-review/${student.registerNumber}/${reviewType}`);
          files[`${student.registerNumber}_${reviewType}`] = response.data; // Store the object directly
        } catch (error) {
          // console.error(`Error fetching ${reviewType} review for ${student.registerNumber}:`, error); // Suppress frequent errors
          files[`${student.registerNumber}_${reviewType}`] = { pdfPath: null, pptPath: null, otherPath: null, uploadedAt: null }; // Ensure empty object
        }
      }
    }
    setLatestReviewFiles(files);
  };

  // Update latest review files when students or ugProjects change
  useEffect(() => {
    if (pgPrograms.includes(selectedProgram) && students.length > 0) {
      fetchLatestReviewFiles(students);
    } else if (ugPrograms.includes(selectedProgram) && ugProjects.length > 0) {
      const allUgStudents = ugProjects.flatMap(project => project.projectMembers);
      fetchLatestReviewFiles(allUgStudents);
    } else {
      setLatestReviewFiles({});
    }
  }, [students, ugProjects, selectedProgram]);


  // Polling for students/projects (consider using Firestore real-time listeners for chat for better efficiency)
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedProgram) { // Only poll if a program is selected
        if (pgPrograms.includes(selectedProgram)) {
          fetchPgStudents();
        } else if (ugPrograms.includes(selectedProgram)) {
          fetchUgProjects();
        }
      }
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [selectedProgram, teacherEmail]); // Depend on selectedProgram and teacherEmail


  const handleCloseChat = () => {
    setSelectedStudentRegisterNumber(null);
  };

  // This handles changes in the main table's Assessment fields directly (for PG programs only)
  const handleMarkChange = (index, field, value) => {
    const updatedStudents = [...students];
    const numericValue = Number(value);
    updatedStudents[index][field] = isNaN(numericValue) ? 0 : numericValue;
    updatedStudents[index].marks4 = Math.ceil((
        (Number(updatedStudents[index].marks1) || 0) +
        (Number(updatedStudents[index].marks2) || 0) +
        (Number(updatedStudents[index].marks3) || 0)
      ) / 3);
    setStudents(updatedStudents);
  };

  // Handler to save all marks to the backend (for Assessment1,2,3 from main table)
  // This currently applies to PG students. For UG, marks are saved via the review modal.
  const handleSaveAllMarks = async () => {
    try {
      const payload = {
        students: students.map((student) => ({
          registerNumber: student.registerNumber,
          courseName: student.courseName,
          Assessment1: Number(student.marks1) || 0,
          Assessment2: Number(student.marks2) || 0,
          Assessment3: Number(student.marks3) || 0,
          Total: Number(student.Total) || 0,
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
    let dataToExport = [];
    if (pgPrograms.includes(selectedProgram)) {
      dataToExport = students.map(student => ({
        "Register Number": student.registerNumber,
        "Assessment 1": student.marks1,
        "Assessment 2": student.marks2,
        "Assessment 3": student.marks3,
        "Total": student.marks4,
      }));
    } else if (ugPrograms.includes(selectedProgram)) {
      dataToExport = ugProjects.map(project => ({
        "Project Name": project.projectName,
        "Register Numbers": project.groupRegisterNumbers.join(', '), // Display all register numbers
        "Assessment 1": project.Assessment1,
        "Assessment 2": project.Assessment2,
        "Assessment 3": project.Assessment3,
        "Total": project.Total, // Added back total for excel consistency
      }));
    }

    if (dataToExport.length === 0) {
      toast.warn("No data to download for the selected program.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedProgram ? `${selectedProgram} Data` : "Data");
    XLSX.writeFile(workbook, `${selectedProgram ? selectedProgram + '_' : ''}Data_Report.xlsx`);
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

  // Re-run unseen message status fetch whenever students or selectedProject (for UG) changes
  useEffect(() => {
    const fetchUnseenStatuses = async () => {
      const statuses = {};
      let studentsToCheck = [];

      if (pgPrograms.includes(selectedProgram)) {
        studentsToCheck = students;
      } else if (ugPrograms.includes(selectedProgram) && ugCurrentView === 'students_in_project' && selectedProject) {
        studentsToCheck = selectedProject.projectMembers;
      }

      if (studentsToCheck.length > 0) {
        for (const student of studentsToCheck) {
          const hasUnseen = await hasUnseenMessages(student.registerNumber);
          statuses[student.registerNumber] = hasUnseen;
        }
      }
      setUnseenMessagesStatus(statuses);
    };
    fetchUnseenStatuses();
  }, [students, selectedProject, ugCurrentView, teacherEmail, selectedProgram]);


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
      // Query only for documents where 'roles' array contains "Coordinator"
      const coordinatorQuery = query(
        usersRef,
        where("roles", "array-contains", "Coordinator")
      );
      const coordinatorSnapshot = await getDocs(coordinatorQuery);

      let programCoordinatorUid = null;
      if (!coordinatorSnapshot.empty) {
        // Filter coordinators in client-side to find the one with the matching department
        const matchingCoordinatorDoc = coordinatorSnapshot.docs.find(doc => {
          const data = doc.data();
          // Check if 'department' field exists and is an array that includes selectedProgram
          return Array.isArray(data.department) && data.department.includes(selectedProgram);
        });

        if (matchingCoordinatorDoc) {
          programCoordinatorUid = matchingCoordinatorDoc.id;
          console.log(`Found coordinator for ${selectedProgram} with UID:`, programCoordinatorUid);
        } else {
          toast.warn(`No coordinator found for ${selectedProgram} in Firebase. Please ensure a coordinator is assigned to this program and their 'department' field in Firestore includes '${selectedProgram}'.`);
          setLoadingReviewData(false);
          console.warn(`No coordinator found for ${selectedProgram} in Firebase. Double check roles and department fields for this coordinator.`);
          return; // Exit early if no coordinator is found
        }
      } else {
        toast.warn(`No coordinator found with the 'Coordinator' role in Firebase.`);
        setLoadingReviewData(false);
        return;
      }

      // 2. Fetch the coordinator's defined review structure for this program
      const coordinatorReviewResponse = await axios.get(`${API_BASE_URL}/coordinator-reviews/${programCoordinatorUid}/${selectedProgram}`);
      const coordinatorData = coordinatorReviewResponse.data.reviewData ;
      setCoordinatorReviewStructure(coordinatorData);
      console.log(`Coordinator review data from backend for ${selectedProgram}:`, coordinatorData);
      if (coordinatorData.length === 0) {
        toast.warn(`Coordinator for ${selectedProgram} has not defined any review items. Please ask them to set it up in their dashboard.`);
        setLoadingReviewData(false);
        return;
      }


      // 3. Fetch the student's existing marks for these review items
      // The server.js endpoint has been updated to handle UG project reflection.
      const studentMarksResponse = await axios.get(`${API_BASE_URL}/student-review-marks/${student.registerNumber}/${student.courseName}`);
      const existingStudentMarks = studentMarksResponse.data.reviewsAssessment || []; // Ensure this is always an array
      console.log(`Existing student marks from backend for ${student.registerNumber} in ${student.courseName}:`, existingStudentMarks);


      // Combine coordinator's structure with student's existing marks
      const combinedReviewData = coordinatorData.map(coordItem => {
        // Find existing mark by matching the first description field (r1_desc)
        const existingMark = existingStudentMarks.find(studentItem =>
          studentItem.description === coordItem.r1_desc
        );

        return {
          r1_item_desc: coordItem.r1_desc,
          r2_item_desc: coordItem.r2_desc,
          r3_item_desc: coordItem.r3_desc,
          coord_r1_max: Number(coordItem.r1_mark) || 0,
          coord_r2_max: Number(coordItem.r2_mark) || 0,
          coord_r3_max: Number(coordItem.r3_mark) || 0,
          // If existingMark is found, use its value; otherwise, default to 0
          r1_mark: existingMark ? Number(existingMark.r1_mark) || 0 : 0,
          r2_mark: existingMark ? Number(existingMark.r2_mark) || 0 : 0,
          r3_mark: existingMark ? Number(existingMark.r3_mark) || 0 : 0,
        };
      });
      setStudentReviewMarks(combinedReviewData);
      console.log("Combined review data for modal display (after merging with existing marks):", combinedReviewData);


    } catch (error) {
      console.error("Error loading review data for student:", error);
      toast.error(`Failed to load review details: ${error.response?.data?.error || error.message}`);
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
      // Ensure the value is treated as a number
      updatedMarks[index][reviewType] = Number(value);

      // Validation: Ensure awarded mark does not exceed max mark
      const coordMaxKey = reviewType.replace('mark', 'max'); // e.g., r1_mark -> coord_r1_max
      const maxAllowed = updatedMarks[index][coordMaxKey];
      if (updatedMarks[index][reviewType] > maxAllowed) {
        updatedMarks[index][reviewType] = maxAllowed;
        toast.warn(`Mark for ${reviewType.replace('_mark', '').toUpperCase()} cannot exceed ${maxAllowed}. Value adjusted.`);
      }

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
      // Determine the list of students whose assessments need to be updated.
      // For PG, it's just the current student. For UG, it's all students in the project.
      let studentsToUpdate = [];
      if (pgPrograms.includes(selectedProgram)) {
        studentsToUpdate.push(currentStudentForReview);
      } else if (ugPrograms.includes(selectedProgram) && selectedProject) {
        // For UG, we update all members of the selected project
        studentsToUpdate = selectedProject.projectMembers;
      } else {
        toast.error("Invalid state for saving marks. No project selected for UG.");
        setSavingReviewMarks(false);
        return;
      }

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

        const coordMaxItem = coordinatorReviewStructure[index];
        totalPossibleR1Marks += Number(coordMaxItem?.r1_mark) || 0;
        totalPossibleR2Marks += Number(coordMaxItem?.r2_mark) || 0;
        totalPossibleR3Marks += Number(coordMaxItem?.r3_mark) || 0;
      });

      let normalizedAssessment1 = 0;
      if (totalPossibleR1Marks > 0) {
        normalizedAssessment1 = (totalAwardedR1Marks / totalPossibleR1Marks) * 100;
      }
      normalizedAssessment1 = Math.round(normalizedAssessment1);

      let normalizedAssessment2 = 0;
      if (totalPossibleR2Marks > 0) {
        normalizedAssessment2 = (totalAwardedR2Marks / totalPossibleR2Marks) * 100;
      }
      normalizedAssessment2 = Math.round(normalizedAssessment2);

      let normalizedAssessment3 = 0;
      if (totalPossibleR3Marks > 0) {
        normalizedAssessment3 = (totalAwardedR3Marks / totalPossibleR3Marks) * 100;
      }
      normalizedAssessment3 = Math.round(normalizedAssessment3);

      const newTotalAverage = Math.ceil((normalizedAssessment1 + normalizedAssessment2 + normalizedAssessment3) / 3);

      // Array to hold all individual update promises
      const updatePromises = studentsToUpdate.map(async (student) => {
          // 1. Save the detailed review marks for each student in the group
          const reviewPayload = {
              registerNumber: student.registerNumber,
              courseName: selectedProgram,
              reviewsAssessment: studentReviewMarks.map((item, index) => ({
                  description: coordinatorReviewStructure[index]?.r1_desc || item.r1_item_desc, // Use coordinator's original description
                  r1_mark: item.r1_mark,
                  r2_mark: item.r2_mark,
                  r3_mark: item.r3_mark,
              }))
          };
          await axios.post(`${API_BASE_URL}/student-review-marks`, reviewPayload);

          // 2. Prepare payload for main Assessment1, 2, 3 and Total
          const assessmentUpdatePayload = {
              students: [{
                  registerNumber: student.registerNumber,
                  courseName: selectedProgram,
                  Assessment1: normalizedAssessment1,
                  Assessment2: normalizedAssessment2,
                  Assessment3: normalizedAssessment3,
                  Total: newTotalAverage,
              }]
          };
          // 3. Send update for Assessment1, 2, 3 and Total to the backend for this student
          await axios.post(`${API_BASE_URL}/update-marks`, assessmentUpdatePayload);
      });

      await Promise.all(updatePromises); // Wait for all updates to complete

      toast.success("Student review marks and Assessments updated successfully!");
      setShowReviewModal(false); // Close modal on successful save

      // Re-fetch data based on current program type to ensure UI is updated
      if (pgPrograms.includes(selectedProgram)) {
        fetchPgStudents();
      } else if (ugPrograms.includes(selectedProgram)) {
        // Re-fetch projects to update aggregated marks and individual student data
        fetchUgProjects();
        // If currently in 'students_in_project' view, update the specific project's students directly
        if (ugCurrentView === 'students_in_project' && selectedProject) {
          // Manually update the selected project's members for immediate UI reflection
          const updatedSelectedProjectMembers = selectedProject.projectMembers.map(member => {
            // Find the student in the group that matches the current member
            // This is crucial to ensure the correct student object is updated with new marks
            const updatedStudentInGroup = studentsToUpdate.find(s => s.registerNumber === member.registerNumber);
            return updatedStudentInGroup ? {
              ...member,
              Assessment1: normalizedAssessment1,
              Assessment2: normalizedAssessment2,
              Assessment3: normalizedAssessment3,
              Total: newTotalAverage,
              // Update the reviewsAssessment for immediate display in the student's review modal if reopened
              reviewsAssessment: studentReviewMarks.map(item => ({
                description: item.r1_item_desc, // Ensure description is consistent
                r1_mark: item.r1_mark,
                r2_mark: item.r2_mark,
                r3_mark: item.r3_mark,
              }))
            } : member;
          });

          setSelectedProject(prevProject => ({
            ...prevProject,
            projectMembers: updatedSelectedProjectMembers
          }));
          setStudentsInSelectedProject(updatedSelectedProjectMembers); // Update the state for the table
        }
      }
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

  // Function to download the specific student's review marks as PDF
  const handleDownloadStudentReviewPDF = () => {
    if (!currentStudentForReview || studentReviewMarks.length === 0) {
      toast.error("No review data available to download for this student.");
      return;
    }

    const doc = new jsPDF();
    const studentName = currentStudentForReview.studentName;
    const registerNumber = currentStudentForReview.registerNumber;
    const programName = selectedProgram;
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); // DD/MM/YYYY format

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

  // Handler to view students within a selected project
  const handleViewProjectStudents = (project) => {
    setSelectedProject(project);
    setStudentsInSelectedProject(project.projectMembers.sort((a,b) => a.registerNumber.localeCompare(b.registerNumber)));
    setUgCurrentView('students_in_project');
  };

  // Handler to go back from student list to project list
  const handleBackToProjects = () => {
    setUgCurrentView('projects');
    setSelectedProject(null);
    setStudentsInSelectedProject([]);
  };

  // Helper to format deadline dates
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Helper to calculate days late
  const calculateDaysLate = (uploadedAt, deadline) => {
    if (!uploadedAt || !deadline) return null;
    const uploadDate = new Date(uploadedAt);
    const deadlineDate = new Date(deadline);
    // Set both to start of day to compare dates only
    uploadDate.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    if (uploadDate > deadlineDate) {
      const diffTime = Math.abs(uploadDate - deadlineDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} day(s) late`;
    }
    return null; // Not late
  };


  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 bg-gray-100 font-inter">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Enrolled Students Dashboard
      </h1>

      {!selectedProgram && (
  <div className="programs-grid">
    {allPrograms.map((program) => (
      <div
        key={program}
        className="program-card vibrant"
        onClick={() => setSelectedProgram(program)}
      >
        <h3>{program}</h3>
        <p>{studentCounts[program] ?? 0} Student{(studentCounts[program] ?? 0) === 1 ? "" : "s"}</p>
      </div>
    ))}
  </div>
)}

      {selectedProgram && (
        <div className="w-full max-w-6xl bg-white p-6 rounded-lg shadow-xl" role="main">
          {/* Display for PG Students (Existing Table) */}
          {pgPrograms.includes(selectedProgram) && (
            <>
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
                      <th className="py-3 px-6 text-center border-b border-gray-300">Third Review</th> {/* NEW: Third Review Column */}
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
                          {/* Display all three file types for Zeroth Review and late status */}
                          <td className="py-3 px-6 text-center">
                            {latestReviewFiles[`${student.registerNumber}_zeroth`]?.pdfPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_zeroth`].pdfPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block"
                              >
                                PDF
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_zeroth`]?.pptPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_zeroth`].pptPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                PPT
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_zeroth`]?.otherPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_zeroth`].otherPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                Other
                              </a>
                            )}
                            {(!latestReviewFiles[`${student.registerNumber}_zeroth`]?.pdfPath &&
                             !latestReviewFiles[`${student.registerNumber}_zeroth`]?.pptPath &&
                             !latestReviewFiles[`${student.registerNumber}_zeroth`]?.otherPath) ? (
                              <span className="text-gray-500 text-xs">No Files</span>
                            ) : (
                              <span className={`block mt-1 text-xs ${calculateDaysLate(latestReviewFiles[`${student.registerNumber}_zeroth`]?.uploadedAt, reviewDeadlines.zerothReviewDeadline) ? 'text-red-500' : 'text-green-600'}`}>
                                {calculateDaysLate(latestReviewFiles[`${student.registerNumber}_zeroth`]?.uploadedAt, reviewDeadlines.zerothReviewDeadline) || "(On Time)"}
                              </span>
                            )}
                          </td>
                          {/* Display all three file types for First Review and late status */}
                          <td className="py-3 px-6 text-center">
                            {latestReviewFiles[`${student.registerNumber}_first`]?.pdfPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_first`].pdfPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block"
                              >
                                PDF
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_first`]?.pptPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_first`].pptPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                PPT
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_first`]?.otherPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_first`].otherPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                Other
                              </a>
                            )}
                            {(!latestReviewFiles[`${student.registerNumber}_first`]?.pdfPath &&
                             !latestReviewFiles[`${student.registerNumber}_first`]?.pptPath &&
                             !latestReviewFiles[`${student.registerNumber}_first`]?.otherPath) ? (
                              <span className="text-gray-500 text-xs">No Files</span>
                            ) : (
                              <span className={`block mt-1 text-xs ${calculateDaysLate(latestReviewFiles[`${student.registerNumber}_first`]?.uploadedAt, reviewDeadlines.firstReviewDeadline) ? 'text-red-500' : 'text-green-600'}`}>
                                {calculateDaysLate(latestReviewFiles[`${student.registerNumber}_first`]?.uploadedAt, reviewDeadlines.firstReviewDeadline) || "On Time"}
                              </span>
                            )}
                          </td>
                          {/* Display all three file types for Second Review and late status */}
                          <td className="py-3 px-6 text-center">
                            {latestReviewFiles[`${student.registerNumber}_second`]?.pdfPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_second`].pdfPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block"
                              >
                                PDF
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_second`]?.pptPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_second`].pptPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                                >
                                PPT
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_second`]?.otherPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_second`].otherPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                Other
                              </a>
                            )}
                            {(!latestReviewFiles[`${student.registerNumber}_second`]?.pdfPath &&
                             !latestReviewFiles[`${student.registerNumber}_second`]?.pptPath &&
                             !latestReviewFiles[`${student.registerNumber}_second`]?.otherPath) ? (
                              <span className="text-gray-500 text-xs">No Files</span>
                            ) : (
                              <span className={`block mt-1 text-xs ${calculateDaysLate(latestReviewFiles[`${student.registerNumber}_second`]?.uploadedAt, reviewDeadlines.secondReviewDeadline) ? 'text-red-500' : 'text-green-600'}`}>
                                {calculateDaysLate(latestReviewFiles[`${student.registerNumber}_second`]?.uploadedAt, reviewDeadlines.secondReviewDeadline) || "On Time"}
                              </span>
                            )}
                          </td>
                          {/* NEW: Display all three file types for Third Review and late status */}
                          <td className="py-3 px-6 text-center">
                            {latestReviewFiles[`${student.registerNumber}_third`]?.pdfPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_third`].pdfPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block"
                              >
                                PDF
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_third`]?.pptPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_third`].pptPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                PPT
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_third`]?.otherPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_third`].otherPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                Other
                              </a>
                            )}
                            {(!latestReviewFiles[`${student.registerNumber}_third`]?.pdfPath &&
                             !latestReviewFiles[`${student.registerNumber}_third`]?.pptPath &&
                             !latestReviewFiles[`${student.registerNumber}_third`]?.otherPath) ? (
                              <span className="text-gray-500 text-xs">No Files</span>
                            ) : (
                              <span className={`block mt-1 text-xs ${calculateDaysLate(latestReviewFiles[`${student.registerNumber}_third`]?.uploadedAt, reviewDeadlines.thirdReviewDeadline) ? 'text-red-500' : 'text-green-600'}`}>
                                {calculateDaysLate(latestReviewFiles[`${student.registerNumber}_third`]?.uploadedAt, reviewDeadlines.thirdReviewDeadline) || "On Time"}
                              </span>
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
                        <td colSpan="11" className="py-4 text-center text-gray-500"> {/* MODIFIED: colSpan to 11 */}
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
            </>
          )}

          {/* Display for UG Students (Project-based View) */}
          {ugPrograms.includes(selectedProgram) && ugCurrentView === 'projects' && (
            <>
              <h2 className="text-2xl font-bold mb-4 text-gray-700">
                Projects List for {selectedProgram}
              </h2>
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                  <thead className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal">
                    <tr>
                      <th className="py-3 px-6 text-left border-b border-gray-300">Project Name</th>
                      <th className="py-3 px-6 text-left border-b border-gray-300">Register Numbers</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 1</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 2</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 3</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm font-light">
                    {ugProjects.length > 0 ? (
                      ugProjects.map((project, index) => (
                        <tr key={project.projectName} className="border-b border-gray-200 hover:bg-gray-100">
                          <td className="py-3 px-6 text-left whitespace-nowrap">
                            <span
                              className="text-blue-600 hover:underline cursor-pointer font-medium"
                              onClick={() => handleViewProjectStudents(project)}
                            >
                              {project.projectName}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-left">
                            {/* Display all register numbers in one cell */}
                            {project.groupRegisterNumbers.join(', ')}
                          </td>
                          {/* Display project-level assessments */}
                          <td className="py-3 px-6 text-center">{project.Assessment1 || 0}</td>
                          <td className="py-3 px-6 text-center">{project.Assessment2 || 0}</td>
                          <td className="py-3 px-6 text-center">{project.Assessment3 || 0}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-4 text-center text-gray-500">
                          No UG projects found for this program.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <button
                  onClick={handleDownloadSpreadsheet}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
                >
                  Download Project Data (Excel)
                </button>
              </div>
            </>
          )}

          {/* Display for Students within a Selected UG Project */}
          {ugPrograms.includes(selectedProgram) && ugCurrentView === 'students_in_project' && selectedProject && (
            <>
              <h2 className="text-2xl font-bold mb-4 text-gray-700">
                Students in Project: {selectedProject.projectName}
              </h2>
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                  <thead className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal">
                    <tr>
                      <th className="py-3 px-6 text-left border-b border-gray-300">Register Number</th>
                      <th className="py-3 px-6 text-left border-b border-gray-300">Student Name</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 1</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 2</th>
                      <th className="py-3 px-6 text-center border-b border-300">Assessment 3</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Average</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Zeroth Review</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">First Review</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Second Review</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Third Review</th> {/* NEW: Third Review Column */}
                      <th className="py-3 px-6 text-center border-b border-gray-300">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm font-light">
                    {studentsInSelectedProject.length > 0 ? (
                      studentsInSelectedProject.map((student) => (
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
                          {/* Display current individual assessment marks (should reflect project-wide marks) */}
                          <td className="py-3 px-6 text-center">{student.Assessment1 || 0}</td>
                          <td className="py-3 px-6 text-center">{student.Assessment2 || 0}</td>
                          <td className="py-3 px-6 text-center">{student.Assessment3 || 0}</td>
                          <td className="py-3 px-6 text-center">{student.Total || 0}</td>
                           {/* Display all three file types for Zeroth Review */}
                          <td className="py-3 px-6 text-center">
                            {latestReviewFiles[`${student.registerNumber}_zeroth`]?.pdfPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_zeroth`].pdfPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block"
                              >
                                PDF
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_zeroth`]?.pptPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_zeroth`].pptPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                PPT
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_zeroth`]?.otherPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_zeroth`].otherPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                Other
                              </a>
                            )}
                            {(!latestReviewFiles[`${student.registerNumber}_zeroth`]?.pdfPath &&
                             !latestReviewFiles[`${student.registerNumber}_zeroth`]?.pptPath &&
                             !latestReviewFiles[`${student.registerNumber}_zeroth`]?.otherPath) ? (
                              <span className="text-gray-500 text-xs">No Files</span>
                            ) : (
                              <span className={`block mt-1 text-xs ${calculateDaysLate(latestReviewFiles[`${student.registerNumber}_zeroth`]?.uploadedAt, reviewDeadlines.zerothReviewDeadline) ? 'text-red-500' : 'text-green-600'}`}>
                                {calculateDaysLate(latestReviewFiles[`${student.registerNumber}_zeroth`]?.uploadedAt, reviewDeadlines.zerothReviewDeadline) || "On Time"}
                              </span>
                            )}
                          </td>
                          {/* Display all three file types for First Review and late status */}
                          <td className="py-3 px-6 text-center">
                            {latestReviewFiles[`${student.registerNumber}_first`]?.pdfPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_first`].pdfPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block"
                              >
                                PDF
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_first`]?.pptPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_first`].pptPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                PPT
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_first`]?.otherPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_first`].otherPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                Other
                              </a>
                            )}
                            {(!latestReviewFiles[`${student.registerNumber}_first`]?.pdfPath &&
                             !latestReviewFiles[`${student.registerNumber}_first`]?.pptPath &&
                             !latestReviewFiles[`${student.registerNumber}_first`]?.otherPath) ? (
                              <span className="text-gray-500 text-xs">No Files</span>
                            ) : (
                              <span className={`block mt-1 text-xs ${calculateDaysLate(latestReviewFiles[`${student.registerNumber}_first`]?.uploadedAt, reviewDeadlines.firstReviewDeadline) ? 'text-red-500' : 'text-green-600'}`}>
                                {calculateDaysLate(latestReviewFiles[`${student.registerNumber}_first`]?.uploadedAt, reviewDeadlines.firstReviewDeadline) || "On Time"}
                              </span>
                            )}
                          </td>
                          {/* Display all three file types for Second Review and late status */}
                          <td className="py-3 px-6 text-center">
                            {latestReviewFiles[`${student.registerNumber}_second`]?.pdfPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_second`].pdfPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block"
                              >
                                PDF
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_second`]?.pptPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_second`].pptPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                                >
                                PPT
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_second`]?.otherPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_second`].otherPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                Other
                              </a>
                            )}
                            {(!latestReviewFiles[`${student.registerNumber}_second`]?.pdfPath &&
                             !latestReviewFiles[`${student.registerNumber}_second`]?.pptPath &&
                             !latestReviewFiles[`${student.registerNumber}_second`]?.otherPath) ? (
                              <span className="text-gray-500 text-xs">No Files</span>
                            ) : (
                              <span className={`block mt-1 text-xs ${calculateDaysLate(latestReviewFiles[`${student.registerNumber}_second`]?.uploadedAt, reviewDeadlines.secondReviewDeadline) ? 'text-red-500' : 'text-green-600'}`}>
                                {calculateDaysLate(latestReviewFiles[`${student.registerNumber}_second`]?.uploadedAt, reviewDeadlines.secondReviewDeadline) || "On Time"}
                              </span>
                            )}
                          </td>
                          {/* NEW: Display all three file types for Third Review and late status */}
                          <td className="py-3 px-6 text-center">
                            {latestReviewFiles[`${student.registerNumber}_third`]?.pdfPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_third`].pdfPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block"
                              >
                                PDF
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_third`]?.pptPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_third`].pptPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                PPT
                              </a>
                            )}
                            {latestReviewFiles[`${student.registerNumber}_third`]?.otherPath && (
                              <a
                                href={`${API_BASE_URL}/${latestReviewFiles[`${student.registerNumber}_third`].otherPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline block mt-1"
                              >
                                Other
                              </a>
                            )}
                            {(!latestReviewFiles[`${student.registerNumber}_third`]?.pdfPath &&
                             !latestReviewFiles[`${student.registerNumber}_third`]?.pptPath &&
                             !latestReviewFiles[`${student.registerNumber}_third`]?.otherPath) ? (
                              <span className="text-gray-500 text-xs">No Files</span>
                            ) : (
                              <span className={`block mt-1 text-xs ${calculateDaysLate(latestReviewFiles[`${student.registerNumber}_third`]?.uploadedAt, reviewDeadlines.thirdReviewDeadline) ? 'text-red-500' : 'text-green-600'}`}>
                                {calculateDaysLate(latestReviewFiles[`${student.registerNumber}_third`]?.uploadedAt, reviewDeadlines.thirdReviewDeadline) || "On Time"}
                              </span>
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
                        <td colSpan="11" className="py-4 text-center text-gray-500"> {/* MODIFIED: colSpan to 11 */}
                          No students found in this project.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleBackToProjects}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
                >
                  Back to Projects
                </button>
              </div>
            </>
          )}


          {/* Back button to go back to program selection (for both UG/PG main views) */}
          {(!ugPrograms.includes(selectedProgram) || (ugPrograms.includes(selectedProgram) && ugCurrentView === 'projects')) && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => {
                  setSelectedProgram(null);
                  setStudents([]);
                  setUgProjects([]);
                  setUnseenMessagesStatus({});
                  setLatestReviewFiles({});
                  setUgCurrentView('projects'); // Reset UG view
                  setSelectedProject(null); // Clear selected project
                  setStudentsInSelectedProject([]); // Clear students in project
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
              >
                Select Another Program
              </button>
            </div>
          )}
        </div>
      )}

      {selectedStudentRegisterNumber && (
        <ChatWindow
          currentUser={teacherEmail}
          contactUser={selectedStudentRegisterNumber}
          onClose={handleCloseChat}
        />
      )}

      {/* Review Marks Modal (Remains the same, but now callable from UG project student list) */}
      {showReviewModal && currentStudentForReview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">
              Review Marks for {currentStudentForReview.studentName} ({currentStudentForReview.registerNumber})
            </h3>
            <p className="text-gray-600 mb-4">
              Program: {selectedProgram}
            </p>            <table className="mt-4 w-full border border-gray-300 rounded-md">
  <thead className="bg-gray-100 text-sm text-gray-700">
    <tr>
      <th className="p-2 text-left">Zeroth Review Files</th>
      <th className="p-2 text-left">Comment</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td className="p-2">
        {latestReviewFiles[`${currentStudentForReview.registerNumber}_zeroth`]?.pdfPath && (
          <a
            href={`${API_BASE_URL}/${latestReviewFiles[`${currentStudentForReview.registerNumber}_zeroth`].pdfPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline block"
          >
            PDF
          </a>
        )}
        {latestReviewFiles[`${currentStudentForReview.registerNumber}_zeroth`]?.pptPath && (
          <a
            href={`${API_BASE_URL}/${latestReviewFiles[`${currentStudentForReview.registerNumber}_zeroth`].pptPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline block"
          >
            PPT
          </a>
        )}
        {latestReviewFiles[`${currentStudentForReview.registerNumber}_zeroth`]?.otherPath && (
          <a
            href={`${API_BASE_URL}/${latestReviewFiles[`${currentStudentForReview.registerNumber}_zeroth`].otherPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline block"
          >
            Other
          </a>
        )}
      </td>
      <td className="p-2">
        <input
          type="text"
          placeholder="Enter comment"
          value={newComments[currentStudentForReview.registerNumber] || ""}
          onChange={(e) => handleCommentChange(currentStudentForReview.registerNumber, e.target.value)}
          className="w-full p-1 border border-gray-300 rounded-md text-sm"
        />
        <button
          onClick={() => handleSubmitComment(currentStudentForReview.registerNumber)}
          className="mt-1 text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
        >
          Submit
        </button>
        {zerothReviewComments[currentStudentForReview.registerNumber] && (
          <p className="mt-1 text-xs text-gray-600 italic">
            Saved: {zerothReviewComments[currentStudentForReview.registerNumber]}
          </p>
        )}
      </td>
    </tr>
  </tbody>
</table>



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
                          <th className="py-2 px-4 text-left border-b border-gray-300">Review Item (R1)</th>
                          <th className="py-2 px-4 text-center border-b border-gray-300">R1 Max</th>
                          <th className="py-2 px-4 text-center border-b border-gray-300">R1 Awarded</th>
                          <th className="py-2 px-4 text-left border-b border-gray-300">Review Item (R2)</th>
                          <th className="py-2 px-4 text-center border-b border-gray-300">R2 Max</th>
                          <th className="py-2 px-4 text-center border-b border-gray-300">R2 Awarded</th>
                          <th className="py-2 px-4 text-left border-b border-gray-300">Review Item (R3)</th>
                          <th className="py-2 px-4 text-center border-b border-gray-300">R3 Max</th>
                          <th className="py-2 px-4 text-center border-b border-gray-300">R3 Awarded</th>
                          <th className="py-2 px-4 text-left border-b border-gray-300">Viva</th>
                          
                          <th className="py-2 px-4 text-center border-b border-gray-300">Awarded Marks</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-700 text-sm">
                        {studentReviewMarks.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="py-2 px-4 text-left">{item.r1_item_desc}</td>
                            <td className="py-2 px-4 text-center font-bold text-gray-800">{item.coord_r1_max}</td>
                            <td className="py-2 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max={item.coord_r1_max} // Max value based on coordinator's setting
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
                                max={item.coord_r2_max} // Max value based on coordinator's setting
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
                                max={item.coord_r3_max} // Max value based on coordinator's setting
                                value={item.r3_mark}
                                onChange={(e) => handleStudentReviewMarkChange(index, "r3_mark", e.target.value)}
                                className="w-24 p-1 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                              />
                            </td>
                            
                          </tr>
                        ))}
                      </tbody>
                      
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
                  <p className="text-gray-500 text-center py-4">No review items defined by the coordinator for this program. Please ensure the coordinator for {selectedProgram} has set up review items in their dashboard.</p>
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

