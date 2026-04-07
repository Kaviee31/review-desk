// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/AdminDashboard.css';
import { pgCourses, ugCourses } from "../constants/courses";
import * as XLSX from "xlsx";

export const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;

function AdminDashboard() {
  useEffect(() => {
    document.title = "Admin Dashboard";
  }, []);

  // --- State ---
  const [studentType, setStudentType] = useState('PG');
  const [excelFile, setExcelFile] = useState(null);

  // PG form
  const [pgStudentRegNo, setPgStudentRegNo]           = useState('');
  const [pgTeacherEmail, setPgTeacherEmail]           = useState('');
  const [pgStudentCourseName, setPgStudentCourseName] = useState('');
  const [pgProjectName, setPgProjectName]             = useState('');
  const [loadingPgEnroll, setLoadingPgEnroll]         = useState(false);

  // UG form
  const [ugStudentRegNos, setUgStudentRegNos]         = useState(['']);
  const [ugTeacherEmail, setUgTeacherEmail]           = useState('');
  const [ugStudentCourseName, setUgStudentCourseName] = useState('');
  const [ugProjectName, setUgProjectName]             = useState('');
  const [loadingUgEnroll, setLoadingUgEnroll]         = useState(false);
  const [loadingBulk, setLoadingBulk]                 = useState(false);

  // --- Helpers ---
  const fetchTeacherName = async (teacherEmailToSearch) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("email", "==", teacherEmailToSearch),
        where("userType", "==", "Faculty")
      );
      const snap = await getDocs(q);
      return snap.empty ? null : snap.docs[0].data().username;
    } catch (error) {
      console.error("Error fetching teacher name:", error);
      return null;
    }
  };

  // --- PG submit ---
  const handlePgSubmit = async (event) => {
    event.preventDefault();
    setLoadingPgEnroll(true);
    toast.dismiss();

    if (!pgStudentRegNo || !pgTeacherEmail || !pgStudentCourseName || !pgProjectName) {
      toast.error("Please fill all fields for PG student enrollment.");
      setLoadingPgEnroll(false);
      return;
    }

    const teacherName = await fetchTeacherName(pgTeacherEmail);
    if (!teacherName) {
      toast.error(`No teacher found with email: ${pgTeacherEmail}.`);
      setLoadingPgEnroll(false);
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("registerNumber", "==", pgStudentRegNo),
        where("userType", "==", "Student")
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error(`No student found with Register Number: ${pgStudentRegNo}.`);
        setLoadingPgEnroll(false);
        return;
      }
      const studentDoc = snap.docs[0].data();
      await axios.post(`${API_BASE_URL}/enroll`, {
        studentName:    studentDoc.username,
        registerNumber: pgStudentRegNo,
        email:          studentDoc.email,
        courseName:     pgStudentCourseName,
        teacherName,
        teacherEmail:   pgTeacherEmail,
        projectName:    pgProjectName,
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

  // --- UG submit ---
  const handleUgSubmit = async (event) => {
    event.preventDefault();
    setLoadingUgEnroll(true);
    toast.dismiss();
    const registerNumbersToEnroll = ugStudentRegNos.filter(Boolean);

    if (!registerNumbersToEnroll.length || !ugTeacherEmail || !ugStudentCourseName || !ugProjectName) {
      toast.error("Please fill all required fields for UG enrollment.");
      setLoadingUgEnroll(false);
      return;
    }

    const teacherName = await fetchTeacherName(ugTeacherEmail);
    if (!teacherName) {
      toast.error(`No teacher found with email: ${ugTeacherEmail}.`);
      setLoadingUgEnroll(false);
      return;
    }

    let successCount = 0;
    const failedRegNos = [];

    for (const regNo of registerNumbersToEnroll) {
      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("registerNumber", "==", regNo),
          where("userType", "==", "Student")
        );
        const snap = await getDocs(q);
        if (snap.empty) { failedRegNos.push(regNo); continue; }
        const studentDoc = snap.docs[0].data();
        await axios.post(`${API_BASE_URL}/enroll`, {
          studentName:          studentDoc.username,
          registerNumber:       regNo,
          email:                studentDoc.email,
          courseName:           ugStudentCourseName,
          teacherName,
          teacherEmail:         ugTeacherEmail,
          projectName:          ugProjectName,
          groupRegisterNumbers: registerNumbersToEnroll,
        });
        successCount++;
      } catch (error) {
        console.error(`Error enrolling UG student ${regNo}:`, error);
        failedRegNos.push(regNo);
      }
    }

    if (successCount > 0)      toast.success(`Successfully enrolled ${successCount} UG student(s).`);
    if (failedRegNos.length > 0) toast.warn(`Failed to enroll: ${failedRegNos.join(', ')}.`);

    setUgStudentRegNos(['']);
    setUgTeacherEmail('');
    setUgStudentCourseName('');
    setUgProjectName('');
    setLoadingUgEnroll(false);
  };

  // --- Excel bulk import ---
  const handleExcelEnroll = async () => {
    if (!excelFile) { toast.error("Please select an Excel file first."); return; }
    setLoadingBulk(true);
    try {
      const data     = await excelFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const rows     = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      let success = 0, failed = 0;

      for (const row of rows) {
        try {
          if (!row.TeacherEmail || !row.StudentName || !row.RegisterNumber || !row.Email || !row.CourseName) {
            console.warn("Skipping row due to missing data:", row);
            failed++; continue;
          }
          const teacherName = await fetchTeacherName(row.TeacherEmail);
          if (!teacherName) { console.warn(`No teacher found for: ${row.TeacherEmail}`); failed++; continue; }
          await axios.post(`${API_BASE_URL}/enroll`, {
            studentName:          row.StudentName,
            registerNumber:       row.RegisterNumber,
            email:                row.Email,
            courseName:           row.CourseName,
            teacherName,
            teacherEmail:         row.TeacherEmail,
            projectName:          row.ProjectName || "",
            groupRegisterNumbers: row.GroupRegisterNumbers ? String(row.GroupRegisterNumbers).split(",") : [],
          });
          success++;
        } catch (err) {
          failed++;
          console.error("Enroll failed for:", row.RegisterNumber, err.response?.data || err.message);
        }
      }
      toast.success(`Imported ${success} students. Failed: ${failed}`);
      setExcelFile(null);
    } catch (err) {
      console.error("Excel upload error:", err);
      toast.error("Failed to process Excel file.");
    } finally {
      setLoadingBulk(false);
    }
  };

  // --- UG reg-number list helpers ---
  const handleAddUgStudentInput    = () => setUgStudentRegNos([...ugStudentRegNos, '']);
  const handleRemoveUgStudentInput = () => {
    if (ugStudentRegNos.length > 1) {
      setUgStudentRegNos(ugStudentRegNos.slice(0, -1));
    } else {
      toast.info("At least one student input field is required.");
    }
  };
  const handleUgRegNoChange = (index, value) => {
    const updated = [...ugStudentRegNos];
    updated[index] = value;
    setUgStudentRegNos(updated);
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <div className="enroll-page">

      {/* Page heading */}
      <h1>Enroll Students</h1>

      {/* Tab bar */}
      <div className="enroll-tabs">
        <button
          className={studentType === 'PG' ? 'active' : ''}
          onClick={() => setStudentType('PG')}
        >
          PG Students
        </button>
        <button
          className={studentType === 'UG' ? 'active' : ''}
          onClick={() => setStudentType('UG')}
        >
          UG Students
        </button>
      </div>

      {/* Content card */}
      <div className="enroll-card">

        {/* ── PG form ── */}
        {studentType === 'PG' && (
          <>
            <h2>Assign PG Student to Guide</h2>
            <form onSubmit={handlePgSubmit}>
              <div className="form-grid-2">

                <div className="form-field">
                  <label htmlFor="pgStudentRegNo">Register Number</label>
                  <input
                    type="text"
                    id="pgStudentRegNo"
                    value={pgStudentRegNo}
                    onChange={(e) => setPgStudentRegNo(e.target.value)}
                    placeholder="e.g. 2023CS001"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="pgProjectName">Project Name</label>
                  <input
                    type="text"
                    id="pgProjectName"
                    value={pgProjectName}
                    onChange={(e) => setPgProjectName(e.target.value)}
                    placeholder="Enter project title"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="pgTeacherEmail">Guide Email</label>
                  <input
                    type="email"
                    id="pgTeacherEmail"
                    value={pgTeacherEmail}
                    onChange={(e) => setPgTeacherEmail(e.target.value)}
                    placeholder="guide@annauniv.edu"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="pgStudentCourseName">PG Course</label>
                  <select
                    id="pgStudentCourseName"
                    value={pgStudentCourseName}
                    onChange={(e) => setPgStudentCourseName(e.target.value)}
                    required
                  >
                    <option value="">Select PG Course</option>
                    {pgCourses.map((course) => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                </div>

              </div>

              <button
                type="submit"
                className="enroll-submit-btn"
                disabled={loadingPgEnroll}
              >
                {loadingPgEnroll ? 'Enrolling…' : 'Enroll PG Student'}
              </button>
            </form>
          </>
        )}

        {/* ── UG form ── */}
        {studentType === 'UG' && (
          <>
            <h2>Assign UG Students to Guide</h2>
            <form onSubmit={handleUgSubmit}>
              <div className="form-grid-2">

                <div className="form-field form-grid-full">
                  <label htmlFor="ugProjectName">Project Name</label>
                  <input
                    type="text"
                    id="ugProjectName"
                    value={ugProjectName}
                    onChange={(e) => setUgProjectName(e.target.value)}
                    placeholder="Enter project title"
                    required
                  />
                </div>

                {/* Dynamic register number inputs */}
                <div className="ug-reg-list form-grid-full">
                  {ugStudentRegNos.map((regNo, index) => (
                    <div key={index}>
                      <label htmlFor={`ugStudentRegNo${index}`}>
                        Student Register Number {ugStudentRegNos.length > 1 ? index + 1 : ''}
                      </label>
                      <input
                        type="text"
                        id={`ugStudentRegNo${index}`}
                        value={regNo}
                        onChange={(e) => handleUgRegNoChange(index, e.target.value)}
                        placeholder="e.g. 2023UG042"
                      />
                    </div>
                  ))}
                </div>

                <div className="ug-button-group">
                  <button type="button" onClick={handleAddUgStudentInput}>+ Add Student</button>
                  <button type="button" onClick={handleRemoveUgStudentInput}>− Remove</button>
                </div>

                <div className="form-field">
                  <label htmlFor="ugTeacherEmail">Guide Email</label>
                  <input
                    type="email"
                    id="ugTeacherEmail"
                    value={ugTeacherEmail}
                    onChange={(e) => setUgTeacherEmail(e.target.value)}
                    placeholder="guide@annauniv.edu"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="ugStudentCourseName">UG Course</label>
                  <select
                    id="ugStudentCourseName"
                    value={ugStudentCourseName}
                    onChange={(e) => setUgStudentCourseName(e.target.value)}
                    required
                  >
                    <option value="">Select UG Course</option>
                    {ugCourses.map((course) => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                </div>

              </div>

              <button
                type="submit"
                className="enroll-submit-btn"
                disabled={loadingUgEnroll}
              >
                {loadingUgEnroll ? 'Enrolling…' : 'Enroll UG Students'}
              </button>
            </form>
          </>
        )}

        {/* ── Excel bulk import ── */}
        <div className="excel-section">
          <h2>Bulk Import from Excel</h2>
          <p className="excel-hint">
            UG columns (in order): RegisterNumber, StudentName, Email, CourseName,
            ProjectName, TeacherEmail, GroupRegisterNumbers
          </p>
          <p className="excel-hint">
            PG columns (in order): RegisterNumber, StudentName, Email, CourseName,
            ProjectName, TeacherEmail
          </p>

          <div className="excel-row">
            <input
              id="excel-file-upload"
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setExcelFile(e.target.files[0])}
            />
            <label htmlFor="excel-file-upload" className="excel-select-label">
              Select File
            </label>
            <span className="excel-filename">
              {excelFile ? excelFile.name : 'No file chosen'}
            </span>
            <button
              className="excel-enroll-btn"
              onClick={handleExcelEnroll}
              disabled={loadingBulk}
            >
              {loadingBulk ? 'Importing…' : 'Enroll'}
            </button>
          </div>
        </div>

      </div>{/* /enroll-card */}

    </div>{/* /enroll-page */}

    </>
  );
}

export default AdminDashboard;
