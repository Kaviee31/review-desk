import React, { useEffect, useState, useRef } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/HODDashboard.css';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

function HODDashboard() {
  const [username, setUsername] = useState('HOD');
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [programCounts, setProgramCounts] = useState({});
  const navigate = useNavigate();
  const firstRender = useRef(true);
  const allPrograms = ["MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(SS)","B.TECH(IT)","B.TECH(IT) SS"];
  const API_BASE_URL = "http://localhost:5000";

  useEffect(() => {
    document.title = "HOD Dashboard";
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (Array.isArray(userData.roles) && userData.roles.includes("HOD")) {
              setUsername(userData.username || 'HOD');
              if (firstRender.current) {
                loadProgramCounts();
                firstRender.current = false;
              }
            } else {
              toast.error("Access Denied. You do not have HOD privileges.");
              navigate("/");
            }
          } else {
            toast.error("User profile not found.");
            navigate("/");
          }
        } catch (error) {
          console.error("Error fetching HOD data:", error);
          toast.error("Failed to load HOD data.");
          navigate("/");
        } finally {
          setLoadingUser(false);
        }
      } else {
        toast.info("Please log in.");
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadProgramCounts = async () => {
    try {
      const counts = {};
      for (const program of allPrograms) {
        const response = await axios.get(`${API_BASE_URL}/students-by-program/${program}`);
        counts[program] = response.data.length;
      }
      setProgramCounts(counts);
    } catch (err) {
      console.error("Error fetching program counts", err);
    }
  };

  const fetchStudentsByProgram = async (programName) => {
    setLoadingStudents(true);
    setStudents([]);
    try {
      const response = await axios.get(`${API_BASE_URL}/students-by-program/${programName}`);
      let fetchedStudents = response.data;
      const teacherUsernamesCache = new Map();

      const studentsWithTeacherNames = await Promise.all(fetchedStudents.map(async (student) => {
        let teacherDisplayName = 'N/A';
        if (student.teacherEmail) {
          if (teacherUsernamesCache.has(student.teacherEmail)) {
            teacherDisplayName = teacherUsernamesCache.get(student.teacherEmail);
          } else {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", student.teacherEmail));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const teacherData = querySnapshot.docs[0].data();
              teacherDisplayName = teacherData.username || student.teacherEmail;
              teacherUsernamesCache.set(student.teacherEmail, teacherDisplayName);
            } else {
              teacherDisplayName = student.teacherEmail;
            }
          }
        }
        return {
          ...student,
          marks1: student.Assessment1 || 0,
          marks2: student.Assessment2 || 0,
          marks3: student.Assessment3 || 0,
          marks4: student.Total || 0,
          teacherDisplayName,
        };
      }));

      setStudents(studentsWithTeacherNames);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleProgramClick = (program) => {
    setSelectedProgram(program);
    fetchStudentsByProgram(program);
  };
  
  const handleDownloadZerothReviewPDF = () => {
    if (students.length === 0) {
      toast.warn("No student data available to download.");
      return;
    }

    const doc = new jsPDF();
    doc.text(`${selectedProgram} - Zeroth Review Comments`, 14, 22);

    // **Check if the program is project-based (has projectName)**
    const hasProjectName = students.some(student => student.projectName);

    let tableColumn;
    let tableRows;

    if (hasProjectName) {
      tableColumn = ["Register Number", "Project Name", "Zeroth Review Comment"];
      tableRows = students.map(student => [
        student.registerNumber,
        student.projectName || "N/A",
        student.zerothReviewComment || "No comment submitted"
      ]);
    } else {
      tableColumn = ["Register Number", "Zeroth Review Comment"];
      tableRows = students.map(student => [
        student.registerNumber,
        student.zerothReviewComment || "No comment submitted"
      ]);
    }

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    doc.save(`${selectedProgram}_Zeroth_Review_Comments.pdf`);
    toast.success("PDF downloaded successfully!");
  };

  if (loadingUser) {
    return <div className="loading">Loading HOD Dashboard...</div>;
  }

  return (
    <div className="hod-container">
      <h1>Welcome, {username}</h1>

      {!selectedProgram && (
        <div className="programs-grid">
          {allPrograms.map((program) => (
            <div key={program} className="program-card" onClick={() => handleProgramClick(program)}>
              <h3>{program}</h3>
              <p>{programCounts[program] || 0} Students</p>
            </div>
          ))}
        </div>
      )}

      {selectedProgram && (
        <div className="students-section">
          <div className="section-header">
            <h2>{selectedProgram} - Enrolled Students</h2>
            <button onClick={handleDownloadZerothReviewPDF} className="download-btn">
              Download Zeroth Review Comments
            </button>
          </div>
          {loadingStudents ? (
            <p>Loading students...</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Register Number</th>
                    <th>Student Name</th>
                    <th>Assessment 1</th>
                    <th>Assessment 2</th>
                    <th>Assessment 3</th>
                    <th>Total</th>
                    <th>Viva Total</th>
                    <th>Assigned Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length > 0 ? students.map((student) => (
                    <tr key={student.registerNumber}>
                      <td>{student.registerNumber}</td>
                      <td>{student.studentName}</td>
                      <td>{student.marks1}</td>
                      <td>{student.marks2}</td>
                      <td>{student.marks3}</td>
                      <td>{student.marks4}</td>
                      <td>{student.viva_total_awarded || 0}</td>
                      <td>{student.teacherDisplayName}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="8">No students found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={() => setSelectedProgram(null)} className="back-button">
            Back to Programs
          </button>
        </div>
      )}
    </div>
  );
}

export default HODDashboard;