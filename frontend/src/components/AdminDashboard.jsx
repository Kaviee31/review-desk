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


export const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL
function AdminDashboard() {
  useEffect(() => {
    document.title = "Admin Dashboard";
  }, []);

  // State to manage the selected student type (UG or PG)
  const [studentType, setStudentType] = useState('PG');

  // States for PG student enrollment
  const [pgStudentRegNo, setPgStudentRegNo] = useState('');
  const [pgTeacherEmail, setPgTeacherEmail] = useState('');
  const [pgTeacherName, setPgTeacherName] = useState(''); // State to hold fetched teacher name (not displayed)
  const [pgStudentCourseName, setPgStudentCourseName] = useState('');
  const [pgProjectName, setPgProjectName] = useState('');
  const [loadingPgEnroll, setLoadingPgEnroll] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [ugStudentRegNos, setUgStudentRegNos] = useState(['']);
  const [ugTeacherEmail, setUgTeacherEmail] = useState('');
  const [ugTeacherName, setUgTeacherName] = useState(''); // State to hold fetched teacher name (not displayed)
  const [ugStudentCourseName, setUgStudentCourseName] = useState('');
  const [ugProjectName, setUgProjectName] = useState('');
  const [loadingUgEnroll, setLoadingUgEnroll] = useState(false);

 
  // Fetches a teacher's name from Firestore based on their email.
// Fetch teacher's name from Firestore
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
  // Handles the submission of the PG student enrollment form.
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
    setPgTeacherName(fetchedTeacherName); // Store name in state, but don't display it

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
      const studentName = studentDoc.username;
      const studentEmail = studentDoc.email;

     await axios.post(`${API_BASE_URL}/enroll`, {
  studentName: row.StudentName,
  registerNumber: row.RegisterNumber,
  email: row.Email,
  courseName: row.CourseName,
  teacherName: fetchedTeacherName,
  teacherEmail: row.TeacherEmail,
  projectName: row.ProjectName || "",
  groupRegisterNumbers: row.CourseName.startsWith("MCA")
    ? [] 
    : row.GroupRegisterNumbers
      ? row.GroupRegisterNumbers.split(",")
      : [],
});


      toast.success(`PG Student ${studentName} enrolled successfully!`);
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

  const handleAddUgStudentInput = () => {
    setUgStudentRegNos([...ugStudentRegNos, '']);
  };
const handleExcelUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let success = 0, failed = 0;

    for (const row of rows) {
      try {
        // 🔍 Auto-fetch teacherName from Firestore
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
          teacherName: fetchedTeacherName,   // ✅ auto-filled
          teacherEmail: row.TeacherEmail,
          projectName: row.ProjectName || "",
          groupRegisterNumbers: row.GroupRegisterNumbers ? row.GroupRegisterNumbers.split(",") : [],
        });

        success++;
      } catch (err) {
        failed++;
        console.error("Enroll failed for:", row.RegisterNumber, err.response?.data || err.message);
      }
    }

    toast.success(`✅ Imported ${success} students. 
      ❌ Failed: ${failed}`);
  } catch (err) {
    console.error("Excel upload error:", err);
    toast.error("Failed to process Excel file.");
  }
};

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

  // Handles the submission of the UG student enrollment form.
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
    setUgTeacherName(fetchedTeacherName); // Store name in state, not for display

    let allSuccess = true;
    let successCount = 0;
    let failedRegNos = [];

    for (const regNo of registerNumbersToEnroll) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("registerNumber", "==", regNo), where("userType", "==", "Student"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          failedRegNos.push(regNo);
          allSuccess = false;
          continue;
        }

        const studentDoc = querySnapshot.docs[0].data();
        const studentName = studentDoc.username;
        const studentEmail = studentDoc.email;

        await axios.post(`${API_BASE_URL}/enroll`, {
          studentName: studentName,
          registerNumber: regNo,
          email: studentEmail,
          courseName: ugStudentCourseName,
          teacherName: fetchedTeacherName, // Use fetched name for the request
          teacherEmail: ugTeacherEmail,
          projectName: ugProjectName,
          groupRegisterNumbers: registerNumbersToEnroll,
        });
        successCount++;
      } catch (error) {
        console.error(`Error enrolling UG student ${regNo}:`, error);
        failedRegNos.push(regNo);
        allSuccess = false;
      }
    }

    if (successCount > 0) {
        toast.success(`Successfully enrolled ${successCount} UG student(s).`);
    }
    if (!allSuccess) {
        toast.warn(`Failed to enroll: ${failedRegNos.join(', ')}.`);
    }

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
          groupRegisterNumbers: row.GroupRegisterNumbers ? row.GroupRegisterNumbers.split(",") : [],
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


  return (
    <div className='teacher-dashboard-layout'>
  <div className='cont'>
  <div className="admin-sidebar">
    <h2>Admin Panel</h2>
    <button
      onClick={() => setStudentType('UG')}
      className={studentType === 'UG' ? 'active' : ''}
    >
      UG Students
    </button>
    <button
      onClick={() => setStudentType('PG')}
      className={studentType === 'PG' ? 'active' : ''}
    >
      PG Students
    </button>
  </div>

  <div className="dashboard-content">
    <h2>Enroll Students</h2>

    {studentType === 'PG' && (
      <div>
        <h3>Assign PG Student to Guide</h3>
        <form onSubmit={handlePgSubmit}>
          <label htmlFor="pgStudentRegNo">Student Register Number:</label>
          <input
            type="text"
            id="pgStudentRegNo"
            value={pgStudentRegNo}
            onChange={(e) => setPgStudentRegNo(e.target.value)}
            placeholder="Enter student's register number"
            required
          />
          <label htmlFor="pgProjectName">Project Name:</label>
          <input
            type="text"
            id="pgProjectName"
            value={pgProjectName}
            onChange={(e) => setPgProjectName(e.target.value)}
            placeholder="Enter project name"
            required
          />
          <label htmlFor="pgTeacherEmail">Teacher Email:</label>
          <input
            type="email"
            id="pgTeacherEmail"
            value={pgTeacherEmail}
            onChange={(e) => setPgTeacherEmail(e.target.value)}
            placeholder="Enter teacher's email"
            required
          />
          <label htmlFor="pgStudentCourseName">PG Course Name:</label>
          <select
            id="pgStudentCourseName"
            value={pgStudentCourseName}
            onChange={(e) => setPgStudentCourseName(e.target.value)}
            required
          >
            <option value="">Select PG Course</option>
            {pgCourses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
          <button type="submit" disabled={loadingPgEnroll}>
            {loadingPgEnroll ? 'Enrolling...' : 'Enroll PG Student'}
          </button>
        </form>
      </div>
    )}

    {studentType === 'UG' && (
      <div>
        <h3>Assign UG Students to Guide</h3>
        <form onSubmit={handleUgSubmit}>
          <label htmlFor="ugProjectName">Project Name:</label>
          <input
            type="text"
            id="ugProjectName"
            value={ugProjectName}
            onChange={(e) => setUgProjectName(e.target.value)}
            placeholder="Enter project name"
            required
          />
          {ugStudentRegNos.map((regNo, index) => (
            <div key={index}>
              <label htmlFor={`ugStudentRegNo${index}`}>
                Student Register Number {index + 1}:
              </label>
              <input
                type="text"
                id={`ugStudentRegNo${index}`}
                value={regNo}
                onChange={(e) => handleUgRegNoChange(index, e.target.value)}
                placeholder="Enter student's register number"
              />
            </div>
          ))}
          <div
            className="ug-button-group"
            style={{ display: 'flex', gap: '10px', marginTop: '10px' }}
          >
            <button
              type="button"
              onClick={handleAddUgStudentInput}
              className="add-student-button"
            >
              Add Student
            </button>
            <button
              type="button"
              onClick={handleRemoveUgStudentInput}
              className="remove-student-button"
            >
              Remove
            </button>
          </div>
          <label htmlFor="ugTeacherEmail">Teacher Email:</label>
          <input
            type="email"
            id="ugTeacherEmail"
            value={ugTeacherEmail}
            onChange={(e) => setUgTeacherEmail(e.target.value)}
            placeholder="Enter teacher's email"
            required
          />
          <label htmlFor="ugStudentCourseName">UG Course Name:</label>
          <select
            id="ugStudentCourseName"
            value={ugStudentCourseName}
            onChange={(e) => setUgStudentCourseName(e.target.value)}
            required
          >
            <option value="">Select UG Course</option>
            {ugCourses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

          <button type="submit" disabled={loadingUgEnroll}>
            {loadingUgEnroll ? 'Enrolling...' : 'Enroll UG Students'}
          </button>
        </form>
      </div>
    )}

    {/* ✅ Bulk Import Section (works for both PG/UG) */}
    {/* ✅ Bulk Import Section (Improved UI) */}
<div className="excel-upload" style={{ marginTop: "30px" }}>
  <h3 style={{ marginBottom: '10px' }}>Bulk Import from Excel</h3>

  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#f9f9f9',
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    maxWidth: '500px'
  }}>
    <input
      type="file"
      accept=".xlsx, .xls"
      onChange={(e) => setExcelFile(e.target.files[0])}
      style={{
        padding: '5px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        flex: 1
      }}
    />
    <button
      onClick={handleExcelEnroll}
      style={{
        padding: '6px 12px',
        borderRadius: '6px',
        border: 'none',
        backgroundColor: '#4caf50',
        color: 'white',
        cursor: 'pointer'
      }}
    >
      Enroll
    </button>
  </div>
</div>

  </div>
</div>
<Footer />
</div>

  );
}

export default AdminDashboard;
