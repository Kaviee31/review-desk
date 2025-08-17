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
import { pgCourses, ugCourses, courses } from "../constants/courses";
export const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL

function HODDashboard() {
  const [username, setUsername] = useState('HOD');
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [students, setStudents] = useState([]);
  const [ugProjects, setUgProjects] = useState([]); // New state for UG projects
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [programCounts, setProgramCounts] = useState({});
  const navigate = useNavigate();
  const firstRender = useRef(true);
  const pgPrograms = pgCourses;
  const ugPrograms = ugCourses;
  const allPrograms = courses;
  

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
        const endpoint = ugPrograms.includes(program) ? `${API_BASE_URL}/ug-projects-by-program/${program}` : `${API_BASE_URL}/students-by-program/${program}`;
        const response = await axios.get(endpoint);
        counts[program] = response.data.length;
      }
      setProgramCounts(counts);
    } catch (err) {
      console.error("Error fetching program counts", err);
    }
  };

  const fetchPgStudentsByProgram = async (programName) => {
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
  
// In HODDashboard.jsx

const fetchUgProjectsByProgram = async (programName) => {
  setLoadingStudents(true);
  setUgProjects([]);
  try {
    const response = await axios.get(`${API_BASE_URL}/ug-projects-by-program/${programName}`);
    
    const projectsWithDetails = await Promise.all(response.data.map(async (project) => {
      let teacherDisplayName = 'N/A';
      const teacherEmail = project.teacherEmail;

      if (teacherEmail) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", teacherEmail));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const teacherData = querySnapshot.docs[0].data();
          teacherDisplayName = teacherData.username || teacherEmail;
        } else {
          teacherDisplayName = teacherEmail; // Fallback to email if user not found in 'users' collection
        }
      }
      
      // Explicitly map all required properties and provide fallbacks for safety.
      return {
        projectName: project.projectName || "Unnamed Project",
        groupRegisterNumbers: project.groupRegisterNumbers || [],
        teacherDisplayName: teacherDisplayName,
        zerothReviewComment: project.zerothReviewComment || "No comment submitted",
        Assessment1: project.Assessment1 || 0,
        Assessment2: project.Assessment2 || 0,
        Assessment3: project.Assessment3 || 0,
        Total: project.Total || 0,
        viva_total_awarded: project.viva_total_awarded || 0,
      };
    }));

    setUgProjects(projectsWithDetails);
  } catch (error) {
    console.error("Error fetching UG projects:", error);
    toast.error("Failed to load projects.");
  } finally {
    setLoadingStudents(false);
  }
};

  const handleProgramClick = (program) => {
    setSelectedProgram(program);
    if (ugPrograms.includes(program)) {
      fetchUgProjectsByProgram(program);
    } else {
      fetchPgStudentsByProgram(program);
    }
  };

  const handleDownloadZerothReviewPDF = () => {
    if (ugPrograms.includes(selectedProgram)) {
      if (ugProjects.length === 0) {
        toast.warn("No projects found to download.");
        return;
      }
      const doc = new jsPDF();
      doc.text(`${selectedProgram} - Zeroth Review Comments`, 14, 22);
      const tableColumn = ["Project Name", "Project Members", "Assigned Teacher", "Zeroth Review Comment"];
      const tableRows = ugProjects.map(project => [
        project.projectName || "N/A",
        project.groupRegisterNumbers.join(', ') || "N/A",
        project.teacherDisplayName || "N/A",
        project.zerothReviewComment || "No comment submitted"
      ]);
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
      });
      doc.save(`${selectedProgram}_Zeroth_Review_Comments.pdf`);
      toast.success("PDF downloaded successfully!");
    } else {
      if (students.length === 0) {
        toast.warn("No student data available to download.");
        return;
      }
      const doc = new jsPDF();
      doc.text(`${selectedProgram} - Zeroth Review Comments`, 14, 22);
      const tableColumn = ["Register Number", "Student Name","Project Name", "Zeroth Review Comment"];
      const tableRows = students.map(student => [
        student.registerNumber,
        student.studentName || "N/A",
        student.projectName,
        student.zerothReviewComment || "No comment submitted"
      ]);
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
      });
      doc.save(`${selectedProgram}_Zeroth_Review_Comments.pdf`);
      toast.success("PDF downloaded successfully!");
    }
  };

  if (loadingUser) {
    return <div className="loading">Loading HOD Dashboard...</div>;
  }

  const renderPgStudentsTable = () => (
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
            <th>Zeroth Review Comment</th>
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
              <td>{Math.round(student.viva_total_awarded/3) || 0}</td>
              <td>{student.teacherDisplayName}</td>
              <td>{student.zerothReviewComment || "No comment submitted"}</td>
            </tr>
          )) : (
            <tr><td colSpan="9">No students found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderUgProjectsTable = () => (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Project Name</th>
            <th>Project Members</th>
            <th>Assessment 1</th>
            <th>Assessment 2</th>
            <th>Assessment 3</th>
            <th>Total</th>
            <th>Viva Total</th>
            <th>Assigned Teacher</th>
            <th>Zeroth Review Comment</th>
          </tr>
        </thead>
        <tbody>
          {ugProjects.length > 0 ? ugProjects.map((project) => (
            <tr key={project.projectName}>
              <td>{project.projectName}</td>
              <td>
                {project.groupRegisterNumbers.map((regNo, index) => (
                  <div key={index}>{regNo}</div>
                ))}
              </td>
              <td>{project.Assessment1}</td>
              <td>{project.Assessment2}</td>
              <td>{project.Assessment3}</td>
              <td>{project.Total}</td>
              <td>{Math.round(project.viva_total_awarded / 3) || 0}</td>
              <td>{project.teacherDisplayName || 'N/A'}</td>
              <td>{project.zerothReviewComment || "No comment submitted"}</td>
            </tr>
          )) : (
            <tr><td colSpan="9">No projects found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="hod-container">
      

      {!selectedProgram && (
        <div className="programs-grid">
          {allPrograms.map((program) => (
            <div
              key={program}
              className="program-card"
              style={{
                border: "2px solid orange",
                borderRadius: "8px",
                transition: "border-color 0.3s ease"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "darkorange")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "orange")}
              onClick={() => handleProgramClick(program)}
            >
              <h3>{program}</h3>
              <p>{programCounts[program] || 0} {ugPrograms.includes(program) ? 'Projects' : 'Students'}</p>
            </div>
          ))}
        </div>
      )}

      {selectedProgram && (
        <div className="students-section">
          <div className="section-header">
            <h2>{selectedProgram} - {ugPrograms.includes(selectedProgram) ? 'Projects' : 'Enrolled Students'}</h2>
            <button onClick={handleDownloadZerothReviewPDF} className="download-btn">
              Download Zeroth Review Comments
            </button>
          </div>
          {loadingStudents ? (
            <p>Loading students...</p>
          ) : (
            <>
              {ugPrograms.includes(selectedProgram) ? renderUgProjectsTable() : renderPgStudentsTable()}
            </>
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
