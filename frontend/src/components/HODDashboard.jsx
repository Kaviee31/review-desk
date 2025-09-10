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
import Footer from './Footer';
import annaUniversityLogo from '../assets/anna-university-logo.png'; 

export const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL

function HODDashboard() {
  const [username, setUsername] = useState('HOD');
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [students, setStudents] = useState([]);
  const [ugProjects, setUgProjects] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [programCounts, setProgramCounts] = useState({});
  const navigate = useNavigate();
  const firstRender = useRef(true);
  const pgPrograms = pgCourses;
  const ugPrograms = ugCourses;
  const allPrograms = courses;
  const [showPdfDropdown, setShowPdfDropdown] = useState(false);
  const [showExcelDropdown, setShowExcelDropdown] = useState(false);

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
 
  const handleDownloadMarksPDF = (reportType) => {
    const doc = new jsPDF();
    const courseName = selectedProgram || "Report";
    const currentDate = new Date().toLocaleDateString('en-GB');

    let tableColumn = [];
    let tableRows = [];
    let reportTitle = "";
    let fileName = "";

    switch (reportType) {
        case 'assessment1': reportTitle = `${courseName} 1st Assessment Report`; break;
        case 'assessment2': reportTitle = `${courseName} 2nd Assessment Report`; break;
        case 'assessment3': reportTitle = `${courseName} 3rd Assessment Report`; break;
        default: reportTitle = `${courseName} Total Marks Report`; break;
    }
    fileName = `${reportTitle.replace(/\s/g, '_')}.pdf`;

    const tableStartY = addPdfHeader(doc, reportTitle);
    doc.setFontSize(10);
    doc.text(`Generated on: ${currentDate}`, doc.internal.pageSize.width - 14, tableStartY - 5, { align: 'right' });

    if (pgPrograms.includes(selectedProgram)) {
        switch (reportType) {
            case 'assessment1':
                tableColumn = ["Register Number", "Student Name", "Assigned Teacher", "Assessment 1"];
                tableRows = students.map(s => [s.registerNumber, s.studentName, s.teacherDisplayName, s.marks1]);
                break;
            case 'assessment2':
                tableColumn = ["Register Number", "Student Name", "Assigned Teacher", "Assessment 2"];
                tableRows = students.map(s => [s.registerNumber, s.studentName, s.teacherDisplayName, s.marks2]);
                break;
            case 'assessment3':
                tableColumn = ["Register Number", "Student Name", "Assigned Teacher", "Assessment 3"];
                tableRows = students.map(s => [s.registerNumber, s.studentName, s.teacherDisplayName, s.marks3]);
                break;
            default: // total
                tableColumn = ["Register Number", "Student Name", "Assigned Teacher", "Assess1", "Assess2", "Assess3", "Total"];
                tableRows = students.map(s => [s.registerNumber, s.studentName, s.teacherDisplayName, s.marks1, s.marks2, s.marks3, s.marks4]);
                break;
        }
    } else if (ugPrograms.includes(selectedProgram)) {
        switch (reportType) {
            case 'assessment1':
                tableColumn = ["Project Name", "Project Members", "Assigned Teacher", "Assessment 1"];
                tableRows = ugProjects.map(p => [p.projectName, p.groupRegisterNumbers.join(', '), p.teacherDisplayName, p.Assessment1]);
                break;
            case 'assessment2':
                tableColumn = ["Project Name", "Project Members", "Assigned Teacher", "Assessment 2"];
                tableRows = ugProjects.map(p => [p.projectName, p.groupRegisterNumbers.join(', '), p.teacherDisplayName, p.Assessment2]);
                break;
            case 'assessment3':
                tableColumn = ["Project Name", "Project Members", "Assigned Teacher", "Assessment 3"];
                tableRows = ugProjects.map(p => [p.projectName, p.groupRegisterNumbers.join(', '), p.teacherDisplayName, p.Assessment3]);
                break;
            default: // total
                tableColumn = ["Project Name", "Project Members", "Assigned Teacher", "Assess1", "Assess2", "Assess3", "Total"];
                tableRows = ugProjects.map(p => [p.projectName, p.groupRegisterNumbers.join(', '), p.teacherDisplayName, p.Assessment1, p.Assessment2, p.Assessment3, p.Total]);
                break;
        }
    }

    if (tableRows.length === 0) {
      toast.warn("No data available to download.");
      return;
    }

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: tableStartY });
    doc.save(fileName);
    setShowPdfDropdown(false);
  };

  const handleDownloadMarksExcel = (reportType) => {
    let dataToExport = [];
    let fileName = "";
    const baseFileName = `${selectedProgram || 'Report'}`;

    if (pgPrograms.includes(selectedProgram)) {
        switch (reportType) {
            case 'assessment1':
                fileName = `${baseFileName}_Assessment_1.xlsx`;
                dataToExport = students.map(s => ({ "Register Number": s.registerNumber, "Student Name": s.studentName, "Assigned Teacher": s.teacherDisplayName, "Assessment 1": s.marks1 }));
                break;
            case 'assessment2':
                fileName = `${baseFileName}_Assessment_2.xlsx`;
                dataToExport = students.map(s => ({ "Register Number": s.registerNumber, "Student Name": s.studentName, "Assigned Teacher": s.teacherDisplayName, "Assessment 2": s.marks2 }));
                break;
            case 'assessment3':
                fileName = `${baseFileName}_Assessment_3.xlsx`;
                dataToExport = students.map(s => ({ "Register Number": s.registerNumber, "Student Name": s.studentName, "Assigned Teacher": s.teacherDisplayName, "Assessment 3": s.marks3 }));
                break;
            default:
                fileName = `${baseFileName}_Total_Marks.xlsx`;
                dataToExport = students.map(s => ({ "Register Number": s.registerNumber, "Student Name": s.studentName, "Assigned Teacher": s.teacherDisplayName, "Assessment 1": s.marks1, "Assessment 2": s.marks2, "Assessment 3": s.marks3, "Total": s.marks4 }));
                break;
        }
    } else if (ugPrograms.includes(selectedProgram)) {
        switch (reportType) {
            case 'assessment1':
                fileName = `${baseFileName}_Projects_Assessment_1.xlsx`;
                dataToExport = ugProjects.map(p => ({ "Project Name": p.projectName, "Project Members": p.groupRegisterNumbers.join(', '), "Assigned Teacher": p.teacherDisplayName, "Assessment 1": p.Assessment1 }));
                break;
            case 'assessment2':
                fileName = `${baseFileName}_Projects_Assessment_2.xlsx`;
                dataToExport = ugProjects.map(p => ({ "Project Name": p.projectName, "Project Members": p.groupRegisterNumbers.join(', '), "Assigned Teacher": p.teacherDisplayName, "Assessment 2": p.Assessment2 }));
                break;
            case 'assessment3':
                fileName = `${baseFileName}_Projects_Assessment_3.xlsx`;
                dataToExport = ugProjects.map(p => ({ "Project Name": p.projectName, "Project Members": p.groupRegisterNumbers.join(', '), "Assigned Teacher": p.teacherDisplayName, "Assessment 3": p.Assessment3 }));
                break;
            default:
                fileName = `${baseFileName}_Projects_Total_Marks.xlsx`;
                dataToExport = ugProjects.map(p => ({ "Project Name": p.projectName, "Project Members": p.groupRegisterNumbers.join(', '), "Assigned Teacher": p.teacherDisplayName, "Assessment 1": p.Assessment1, "Assessment 2": p.Assessment2, "Assessment 3": p.Assessment3, "Total": p.Total }));
                break;
        }
    }

    if (dataToExport.length === 0) {
      toast.warn("No data to download.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedProgram || "Data");
    XLSX.writeFile(workbook, fileName.replace(/[^a-zA-Z0-9_.]/g, '_'));
    setShowExcelDropdown(false);
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
            teacherDisplayName = teacherEmail;
          }
        }
        
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
    let tableColumn;
    let tableRows;
    let dataAvailable = false;
    const title = `${selectedProgram} - Review Comments`;

    // 1. Prepare data based on the selected program type (PG or UG)
    if (ugPrograms.includes(selectedProgram)) {
      if (ugProjects.length === 0) {
        toast.warn("No projects found to download.");
        return;
      }
      tableColumn = ["Project Name", "Project Members", "Assigned Teacher", "Zeroth Review", "First Review", "Second Review", "Third Review"];
      tableRows = ugProjects.map(project => [
        project.projectName || "N/A",
        project.groupRegisterNumbers.join(', ') || "N/A",
        project.teacherDisplayName || "N/A",
        project.zerothReviewComment || "N/A",
        project.firstReviewComment || "N/A",
        project.secondReviewComment || "N/A",
        project.thirdReviewComment || "N/A"
      ]);
      dataAvailable = true;
    } else {
      if (students.length === 0) {
        toast.warn("No student data available to download.");
        return;
      }
      tableColumn = ["Register Number", "Student Name", "Project Name", "Zeroth Review", "First Review", "Second Review", "Third Review"];
      tableRows = students.map(student => [
        student.registerNumber,
        student.studentName || "N/A",
        student.projectName || "N/A",
        student.zerothReviewComment || "N/A",
        student.firstReviewComment || "N/A",
        student.secondReviewComment || "N/A",
        student.thirdReviewComment || "N/A"
      ]);
      dataAvailable = true;
    }

    if (!dataAvailable) return;

    // 2. Setup PDF document and pagination variables
    const doc = new jsPDF();
    const rowsPerPage = 25;
    const totalPages = Math.ceil(tableRows.length / rowsPerPage);
    const currentDate = new Date().toLocaleDateString('en-GB'); // Format: DD/MM/YYYY

    // 3. Loop through each page and generate its content
    for (let i = 0; i < totalPages; i++) {
      const currentPage = i + 1;
      const startRow = i * rowsPerPage;
      const endRow = startRow + rowsPerPage;
      const pageRows = tableRows.slice(startRow, endRow);

      // Add a new page for subsequent pages
      if (i > 0) {
        doc.addPage();
      }

      // Add the standard header and get the starting Y position for the table
      const tableStartY = addPdfHeader(doc, title);

      // Add the "Downloaded on" date below the header
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(`Downloaded on: ${currentDate}`, doc.internal.pageSize.width - 15, tableStartY - 6, { align: 'right' });

      // Generate the table for the current page's chunk of rows
      autoTable(doc, {
        head: [tableColumn],
        body: pageRows,
        startY: tableStartY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
      });

      // Add the page number footer
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerText = `Page ${currentPage} / ${totalPages}`;
      doc.setFontSize(10);
      doc.text(footerText, 15, pageHeight - 10);
    }

    // 4. Save the final PDF
    doc.save(`${selectedProgram}_Review_Comments.pdf`);
    toast.success("PDF with review comments downloaded successfully!");
  };

  // 2. REUSABLE HEADER FUNCTION ADDED
  const addPdfHeader = (doc, title) => {
    doc.addImage(annaUniversityLogo, 'PNG', 15, 12, 30, 30);
    const textX = 50;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ANNA UNIVERSITY', textX, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text('Department of Information Science and Technology', textX, 28);
    doc.setFontSize(12);
    doc.text(title, textX, 36);
    doc.setLineWidth(0.5);
    doc.line(14, 45, doc.internal.pageSize.width - 14, 45);
    return 55;
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
            </tr>
          )) : (
            <tr><td colSpan="9">No projects found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
   <div className='teacher-dashboard-layout'>
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
        <div >
          <div className="section-header">
            <h2>{selectedProgram} - {ugPrograms.includes(selectedProgram) ? 'Projects' : 'Enrolled Students'}</h2>
            <div className="header-buttons">
              <button onClick={handleDownloadZerothReviewPDF} className="download-btn">
                Download Review Comments
              </button>

              {/* PDF Marks Dropdown */}
              <div className="dropdown-container">
                <div>
                  <button type="button" onClick={() => setShowPdfDropdown(!showPdfDropdown)} className="dropdown-button">
                    Download PDF Marks
                    <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ transform: showPdfDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                {showPdfDropdown && (
                  <div className="dropdown-menu">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadMarksPDF('assessment1'); }} className="dropdown-item">1st Assessment Report</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadMarksPDF('assessment2'); }} className="dropdown-item">2nd Assessment Report</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadMarksPDF('assessment3'); }} className="dropdown-item">3rd Assessment Report</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadMarksPDF('total'); }} className="dropdown-item font-bold">Total Marks Report</a>
                  </div>
                )}
              </div>

              {/* Excel Marks Dropdown */}
              <div className="dropdown-container">
                <div>
                  <button type="button" onClick={() => setShowExcelDropdown(!showExcelDropdown)} className="download-btn" style={{ boxShadow: '0 4px 15px rgba(22, 160, 133, 0.4)' }}>
                    Download Excel Marks
                     <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ transform: showExcelDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                {showExcelDropdown && (
                  <div className="dropdown-menu">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadMarksExcel('assessment1'); }} className="dropdown-item">1st Assessment Report</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadMarksExcel('assessment2'); }} className="dropdown-item">2nd Assessment Report</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadMarksExcel('assessment3'); }} className="dropdown-item">3rd Assessment Report</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadMarksExcel('total'); }} className="dropdown-item font-bold">Total Marks Report</a>
                  </div>
                )}
              </div>
            </div>
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
    <Footer /> 
    </div>
  );
}

export default HODDashboard;