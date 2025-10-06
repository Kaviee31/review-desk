// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db } from '../firebase'; // Import db from your firebase.js config
import { collection, query, where, getDocs } from 'firebase/firestore'; // Import Firestore functions
import { toast } from 'react-toastify'; // For notifications
import 'react-toastify/dist/ReactToastify.css';
import '../styles/AdminDashboard.css';
import { pgCourses, ugCourses } from "../constants/courses";
import * as XLSX from "xlsx";
import Footer from './Footer';

export const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;

function AdminDashboard() {
  useEffect(() => {
    document.title = "Admin Dashboard";
  }, []);

  // --- Component State ---
  const [studentType, setStudentType] = useState('PG');
  const [excelFile, setExcelFile] = useState(null);
  const [isHovered, setIsHovered] = useState(false);

  // PG Form States
  const [pgStudentRegNo, setPgStudentRegNo] = useState('');
  const [pgTeacherEmail, setPgTeacherEmail] = useState('');
  const [pgStudentCourseName, setPgStudentCourseName] = useState('');
  const [pgProjectName, setPgProjectName] = useState('');
  const [loadingPgEnroll, setLoadingPgEnroll] = useState(false);

  // UG Form States
  const [ugStudentRegNos, setUgStudentRegNos] = useState(['']);
  const [ugTeacherEmail, setUgTeacherEmail] = useState('');
  const [ugStudentCourseName, setUgStudentCourseName] = useState('');
  const [ugProjectName, setUgProjectName] = useState('');
  const [loadingUgEnroll, setLoadingUgEnroll] = useState(false);

  const fetchTeacherName = async (teacherEmailToSearch) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef,
        where("email", "==", teacherEmailToSearch),
        where("userType", "==", "Faculty")
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data().username;
      }
      return null;
    } catch (error) {
      console.error("Error fetching teacher name:", error);
      return null;
    }
  };

  const handlePgSubmit = async (event) => {
    event.preventDefault();
    setLoadingPgEnroll(true);
    toast.dismiss();

    if (!pgStudentRegNo || !pgTeacherEmail || !pgStudentCourseName || !pgProjectName) {
      toast.error("Please fill all fields for PG student enrollment.");
      setLoadingPgEnroll(false);
      return;
    }

    const fetchedTeacherName = await fetchTeacherName(pgTeacherEmail);
    if (!fetchedTeacherName) {
      toast.error(`No teacher found with email: ${pgTeacherEmail}.`);
      setLoadingPgEnroll(false);
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("registerNumber", "==", pgStudentRegNo), where("userType", "==", "Student"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error(`No student found with Register Number: ${pgStudentRegNo}.`);
        setLoadingPgEnroll(false);
        return;
      }

      const studentDoc = querySnapshot.docs[0].data();
      await axios.post(`${API_BASE_URL}/enroll`, {
        studentName: studentDoc.username,
        registerNumber: pgStudentRegNo,
        email: studentDoc.email,
        courseName: pgStudentCourseName,
        teacherName: fetchedTeacherName,
        teacherEmail: pgTeacherEmail,
        projectName: pgProjectName,
      });

      toast.success(`PG Student ${studentDoc.username} enrolled successfully!`);
      setPgStudentRegNo('');
      setPgTeacherEmail('');
      setPgStudentCourseName('');
      setPgProjectName('');
    } catch (error) {
      console.error("Error during PG student enrollment:", error);
      toast.error(`Error enrolling PG student: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoadingPgEnroll(false);
    }
  };

  const handleUgSubmit = async (event) => {
    event.preventDefault();
    setLoadingUgEnroll(true);
    toast.dismiss();
    const registerNumbersToEnroll = ugStudentRegNos.filter(Boolean);

    if (registerNumbersToEnroll.length === 0 || !ugTeacherEmail || !ugStudentCourseName || !ugProjectName) {
      toast.error("Please fill all required fields for UG enrollment.");
      setLoadingUgEnroll(false);
      return;
    }

    const fetchedTeacherName = await fetchTeacherName(ugTeacherEmail);
    if (!fetchedTeacherName) {
      toast.error(`No teacher found with email: ${ugTeacherEmail}.`);
      setLoadingUgEnroll(false);
      return;
    }

    let successCount = 0;
    let failedRegNos = [];

    for (const regNo of registerNumbersToEnroll) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("registerNumber", "==", regNo), where("userType", "==", "Student"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          failedRegNos.push(regNo);
          continue;
        }

        const studentDoc = querySnapshot.docs[0].data();
        await axios.post(`${API_BASE_URL}/enroll`, {
          studentName: studentDoc.username,
          registerNumber: regNo,
          email: studentDoc.email,
          courseName: ugStudentCourseName,
          teacherName: fetchedTeacherName,
          teacherEmail: ugTeacherEmail,
          projectName: ugProjectName,
          groupRegisterNumbers: registerNumbersToEnroll,
        });
        successCount++;
      } catch (error) {
        console.error(`Error enrolling UG student ${regNo}:`, error);
        failedRegNos.push(regNo);
      }
    }

    if (successCount > 0) toast.success(`Successfully enrolled ${successCount} UG student(s).`);
    if (failedRegNos.length > 0) toast.warn(`Failed to enroll: ${failedRegNos.join(', ')}.`);

    setUgStudentRegNos(['']);
    setUgTeacherEmail('');
    setUgStudentCourseName('');
    setUgProjectName('');
    setLoadingUgEnroll(false);
  };

  const handleExcelEnroll = async () => {
    if (!excelFile) {
      toast.error("Please select an Excel file first.");
      return;
    }
    try {
      const data = await excelFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);
      let success = 0, failed = 0;

      for (const row of rows) {
        try {
          if (!row.TeacherEmail || !row.StudentName || !row.RegisterNumber || !row.Email || !row.CourseName) {
            console.warn("Skipping row due to missing data:", row);
            failed++;
            continue;
          }
          const fetchedTeacherName = await fetchTeacherName(row.TeacherEmail);
          if (!fetchedTeacherName) {
            console.warn(`No teacher found for email: ${row.TeacherEmail}`);
            failed++;
            continue;
          }
          await axios.post(`${API_BASE_URL}/enroll`, {
            studentName: row.StudentName,
            registerNumber: row.RegisterNumber,
            email: row.Email,
            courseName: row.CourseName,
            teacherName: fetchedTeacherName,
            teacherEmail: row.TeacherEmail,
            projectName: row.ProjectName || "",
            groupRegisterNumbers: row.GroupRegisterNumbers ? String(row.GroupRegisterNumbers).split(",") : [],
          });
          success++;
        } catch (err) {
          failed++;
          console.error("Enroll failed for:", row.RegisterNumber, err.response?.data || err.message);
        }
      }
      toast.success(`✅ Imported ${success} students. ❌ Failed: ${failed}`);
      setExcelFile(null);
    } catch (err) {
      console.error("Excel upload error:", err);
      toast.error("Failed to process Excel file.");
    }
  };

  const handleAddUgStudentInput = () => setUgStudentRegNos([...ugStudentRegNos, '']);
  const handleRemoveUgStudentInput = () => {
    if (ugStudentRegNos.length > 1) {
      setUgStudentRegNos(ugStudentRegNos.slice(0, -1));
    } else {
      toast.info("At least one student input field is required.");
    }
  };
  const handleUgRegNoChange = (index, value) => {
    const newRegNos = [...ugStudentRegNos];
    newRegNos[index] = value;
    setUgStudentRegNos(newRegNos);
  };

  return (
    <div className='cont'>
      <div className="admin-sidebar">
        <h2>Admin Panel</h2>
        <button onClick={() => setStudentType('UG')} className={studentType === 'UG' ? 'active' : ''}>UG Students</button>
        <button onClick={() => setStudentType('PG')} className={studentType === 'PG' ? 'active' : ''}>PG Students</button>
      </div>

      <div className="main-content-wrapper">
        <div className="dashboard-content">
          <h2>Enroll Students</h2>
          {studentType === 'PG' && (
            <div>
              <h3>Assign PG Student to Guide</h3>
              <form onSubmit={handlePgSubmit}>
                <label htmlFor="pgStudentRegNo">Student Register Number:</label>
                <input type="text" id="pgStudentRegNo" value={pgStudentRegNo} onChange={(e) => setPgStudentRegNo(e.target.value)} placeholder="Enter student's register number" required />
                <label htmlFor="pgProjectName">Project Name:</label>
                <input type="text" id="pgProjectName" value={pgProjectName} onChange={(e) => setPgProjectName(e.target.value)} placeholder="Enter project name" required />
                <label htmlFor="pgTeacherEmail">Teacher Email:</label>
                <input type="email" id="pgTeacherEmail" value={pgTeacherEmail} onChange={(e) => setPgTeacherEmail(e.target.value)} placeholder="Enter teacher's email" required />
                <label htmlFor="pgStudentCourseName">PG Course Name:</label>
                <select id="pgStudentCourseName" value={pgStudentCourseName} onChange={(e) => setPgStudentCourseName(e.target.value)} required>
                  <option value="">Select PG Course</option>
                  {pgCourses.map(course => (<option key={course} value={course}>{course}</option>))}
                </select>
                <button type="submit" disabled={loadingPgEnroll}>{loadingPgEnroll ? 'Enrolling...' : 'Enroll PG Student'}</button>
              </form>
            </div>
          )}

          {studentType === 'UG' && (
            <div>
              <h3>Assign UG Students to Guide</h3>
              <form onSubmit={handleUgSubmit}>
                <label htmlFor="ugProjectName">Project Name:</label>
                <input type="text" id="ugProjectName" value={ugProjectName} onChange={(e) => setUgProjectName(e.target.value)} placeholder="Enter project name" required />
                {ugStudentRegNos.map((regNo, index) => (
                  <div key={index}>
                    <label htmlFor={`ugStudentRegNo${index}`}>Student Register Number {index + 1}:</label>
                    <input type="text" id={`ugStudentRegNo${index}`} value={regNo} onChange={(e) => handleUgRegNoChange(index, e.target.value)} placeholder="Enter student's register number" />
                  </div>
                ))}
                <div className="ug-button-group">
                  <button type="button" onClick={handleAddUgStudentInput} className="add-student-button">Add Student</button>
                  <button type="button" onClick={handleRemoveUgStudentInput} className="remove-student-button">Remove</button>
                </div>
                <label htmlFor="ugTeacherEmail">Teacher Email:</label>
                <input type="email" id="ugTeacherEmail" value={ugTeacherEmail} onChange={(e) => setUgTeacherEmail(e.target.value)} placeholder="Enter teacher's email" required />
                <label htmlFor="ugStudentCourseName">UG Course Name:</label>
                <select id="ugStudentCourseName" value={ugStudentCourseName} onChange={(e) => setUgStudentCourseName(e.target.value)} required>
                  <option value="">Select UG Course</option>
                  {ugCourses.map(course => (<option key={course} value={course}>{course}</option>))}
                </select>
                <button type="submit" disabled={loadingUgEnroll}>{loadingUgEnroll ? 'Enrolling...' : 'Enroll UG Students'}</button>
              </form>
            </div>
          )}
          
          <div className="excel-upload" style={{ marginTop: "40px", paddingTop: "30px", borderTop: "1px solid rgba(255, 255, 255, 0.2)" }}>
            <h3 style={{ marginBottom: '20px' }}>Bulk Import from Excel</h3>
            <h6> ***The Excel sheet's columns for UG Students should be in the order : RegisterNumber , StudentName, Email, CourseName, ProjectName,
              TeacherEmail, GroupRegisterNumbers
            </h6>

            
            <h6> ***The Excel sheet's columns for PG Students should be in the order : RegisterNumber , StudentName, Email, CourseName, ProjectName,
              TeacherEmail
            </h6>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.05)', padding: '15px', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', maxWidth: '550px' }}>
              <input id="excel-file-upload" type="file" accept=".xlsx, .xls" onChange={(e) => setExcelFile(e.target.files[0])} style={{ display: 'none' }} />
              <label htmlFor="excel-file-upload" style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#007BFF', color: 'white', cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}>
                Select File
              </label>
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'black' }}>
                {excelFile ? excelFile.name : "No file chosen"}
              </span>
              <button
                onClick={handleExcelEnroll}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: 'none',
                  backgroundColor: isHovered ? '#218838' : '#28a745',
                  color: 'white', cursor: 'pointer', transition: 'background-color 0.2s'
                }}
              >
                Enroll
              </button>
            </div>
          </div>
          
        </div>
        <div className='footer-st'>
          <Footer />
        </div>
        
      </div>
    </div>
  );
}

export default AdminDashboard;
