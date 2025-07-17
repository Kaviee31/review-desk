// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db } from '../firebase'; // Import db from your firebase.js config
import { collection, query, where, getDocs } from 'firebase/firestore'; // Import Firestore functions
import { toast } from 'react-toastify'; // For notifications
import 'react-toastify/dist/ReactToastify.css';
import '../styles/AdminDashboard.css'; // Assuming this CSS provides styling

function AdminDashboard() {
  useEffect(() => {
    document.title = "Admin Dashboard";
  }, []);

  // State to manage the selected student type (UG or PG)
  const [studentType, setStudentType] = useState('PG'); // Default to PG, as current form is for PG

  // States for PG student enrollment
  const [pgStudentRegNo, setPgStudentRegNo] = useState('');
  const [pgTeacherEmail, setPgTeacherEmail] = useState('');
  const [pgStudentCourseName, setPgStudentCourseName] = useState(''); // State for student's course name (PG)
  const [loadingPgEnroll, setLoadingPgEnroll] = useState(false); // Loading state for PG enrollment process

  // States for UG student enrollment
  const [ugStudentRegNos, setUgStudentRegNos] = useState(['']); // State for dynamic UG student register numbers
  const [ugTeacherEmail, setUgTeacherEmail] = useState('');
  const [ugStudentCourseName, setUgStudentCourseName] = useState(''); // State for student's course name (UG)
  const [ugProjectName, setUgProjectName] = useState(''); // New state for UG Project Name
  const [loadingUgEnroll, setLoadingUgEnroll] = useState(false); // Loading state for UG enrollment process

  // Define available course options for the admin to assign
  const pgCourses = ["MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(SS)"];
  const ugCourses = ["B.TECH(IT)" , "B.TECH(IT) SS"]; // Sample UG courses

  // Function to fetch teacher's name from Firestore
  const fetchTeacherName = async (teacherEmailToSearch) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, 
        where("email", "==", teacherEmailToSearch), 
        where("userType", "==", "Faculty")
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data().username; // Return the teacher's username
      }
      return null; // Teacher not found
    } catch (error) {
      console.error("Error fetching teacher name:", error);
      return null;
    }
  };


  const handlePgSubmit = async (event) => {
    event.preventDefault();
    setLoadingPgEnroll(true);
    toast.dismiss();

    if (!pgStudentRegNo || !pgTeacherEmail || !pgStudentCourseName) {
      toast.error("Please fill all fields for PG student enrollment.");
      setLoadingPgEnroll(false);
      return;
    }

    // Fetch teacher's name
    const teacherName = await fetchTeacherName(pgTeacherEmail);
    if (!teacherName) {
      toast.error(`No teacher found with email: ${pgTeacherEmail}. Please ensure the teacher has signed up.`);
      setLoadingPgEnroll(false);
      return;
    }

    let fetchedStudentName = 'Unknown Student';

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("registerNumber", "==", pgStudentRegNo), where("userType", "==", "Student"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error(`No student found with Register Number: ${pgStudentRegNo}. Please ensure the student has signed up.`);
        setLoadingPgEnroll(false);
        return;
      }

      const studentDoc = querySnapshot.docs[0].data();
      fetchedStudentName = studentDoc.username;
      const studentEmail = studentDoc.email;

      await axios.post("http://localhost:5000/enroll", {
        studentName: fetchedStudentName,
        registerNumber: pgStudentRegNo,
         email: studentEmail,
        courseName: pgStudentCourseName,
        teacherName: teacherName, // Use fetched teacher name
        teacherEmail: pgTeacherEmail,
      });

      toast.success(`PG Student ${fetchedStudentName} enrolled successfully!`);
      setPgStudentRegNo('');
      setPgTeacherEmail('');
      setPgStudentCourseName('');
    } catch (error) {
      console.error("Error during PG student enrollment:", error);
      toast.error(`Error enrolling PG student: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoadingPgEnroll(false);
    }
  };

  // Function to add a new student register number input field
  const handleAddUgStudentInput = () => {
    setUgStudentRegNos([...ugStudentRegNos, '']);
  };

  // Function to handle changes in a specific student register number input
  const handleUgRegNoChange = (index, value) => {
    const newRegNos = [...ugStudentRegNos];
    newRegNos[index] = value;
    setUgStudentRegNos(newRegNos);
  };

  const handleUgSubmit = async (event) => {
    event.preventDefault();
    setLoadingUgEnroll(true);
    toast.dismiss();

    const registerNumbersToEnroll = ugStudentRegNos.filter(Boolean); // Filter out empty strings

    if (registerNumbersToEnroll.length === 0 || !ugTeacherEmail || !ugStudentCourseName || !ugProjectName) {
      toast.error("Please fill Project Name, at least one student register number, teacher email, and UG Course for enrollment.");
      setLoadingUgEnroll(false);
      return;
    }

    // Fetch teacher's name for UG enrollment
    const teacherName = await fetchTeacherName(ugTeacherEmail);
    if (!teacherName) {
      toast.error(`No teacher found with email: ${ugTeacherEmail}. Please ensure the teacher has signed up.`);
      setLoadingUgEnroll(false);
      return;
    }

    let allSuccess = true;
    let successCount = 0;
    let failedRegNos = [];

    for (const regNo of registerNumbersToEnroll) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("registerNumber", "==", regNo), where("userType", "==", "Student"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          toast.error(`Student with Register Number: ${regNo} not found. Skipped enrollment.`);
          failedRegNos.push(regNo);
          allSuccess = false;
          continue;
        }

       const studentDoc = querySnapshot.docs[0].data();
       const  fetchedStudentName = studentDoc.username;
        const studentEmail = studentDoc.email;


        await axios.post("http://localhost:5000/enroll", {
          studentName: fetchedStudentName,
          registerNumber: regNo,
          email: studentEmail,
          courseName: ugStudentCourseName,
          teacherName: teacherName, // Use fetched teacher name
          teacherEmail: ugTeacherEmail,
          projectName: ugProjectName,
          groupRegisterNumbers: registerNumbersToEnroll,
        });
        successCount++;
        toast.success(`UG Student ${fetchedStudentName} (${regNo}) enrolled successfully!`);
      } catch (error) {
        console.error(`Error enrolling UG student ${regNo}:`, error);
        toast.error(`Error enrolling UG student ${regNo}: ${error.response?.data?.error || error.message}`);
        failedRegNos.push(regNo);
        allSuccess = false;
      }
    }

    if (allSuccess) {
      toast.success(`All ${successCount} UG students enrolled successfully!`);
    } else {
      toast.warn(`Enrolled ${successCount} UG students. Failed to enroll: ${failedRegNos.join(', ')}`);
    }

    setUgStudentRegNos(['']); // Reset to one empty input field
    setUgTeacherEmail('');
    setUgStudentCourseName('');
    setUgProjectName('');
    setLoadingUgEnroll(false);
  };


  return (
    <div className='cont'>
      <div className="admin-sidebar">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Admin Panel</h2>
        <div className="flex flex-col space-y-4 w-full">
          <button
            onClick={() => setStudentType('UG')}
            className={`py-2 px-4 rounded-md font-semibold transition duration-200
              ${studentType === 'UG' ? 'bg-blue-600 text-white shadow-md active' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
            `}
          >
            UG Students
          </button>
          <button
            onClick={() => setStudentType('PG')}
            className={`py-2 px-4 rounded-md font-semibold transition duration-200
              ${studentType === 'PG' ? 'bg-blue-600 text-white shadow-md active' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
            `}
          >
            PG Students
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <h2>Enroll Students</h2>

        {studentType === 'PG' && (
          <div>
            <h3>Assign PG Student to Teacher</h3>
            <form onSubmit={handlePgSubmit}>
              <label htmlFor="pgStudentRegNo">Student Register Number:</label>
              <input
                type="text"
                id="pgStudentRegNo"
                value={pgStudentRegNo}
                onChange={(e) => setPgStudentRegNo(e.target.value)}
                required
              />
              <label htmlFor="pgTeacherEmail">Teacher Email:</label>
              <input
                type="email"
                id="pgTeacherEmail"
                value={pgTeacherEmail}
                onChange={(e) => setPgTeacherEmail(e.target.value)}
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
                {loadingPgEnroll ? 'Enrolling PG...' : 'Enroll PG Student'}
              </button>
            </form>
          </div>
        )}

        {studentType === 'UG' && (
          <div>
            <h3>Assign UG Students to Teacher (Bulk)</h3>
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
                <div className="form-group" key={index}>
                  <label htmlFor={`ugStudentRegNo${index}`}>Student Register Number {index + 1}:</label>
                  <input
                    type="text"
                    id={`ugStudentRegNo${index}`}
                    value={regNo}
                    onChange={(e) => handleUgRegNoChange(index, e.target.value)}
                  />
                </div>
              ))}
              <button type="button" onClick={handleAddUgStudentInput} className="add-student-button">
                Add Student
              </button>
              <label htmlFor="ugTeacherEmail">Teacher Email:</label>
              <input
                type="email"
                id="ugTeacherEmail"
                value={ugTeacherEmail}
                onChange={(e) => setUgTeacherEmail(e.target.value)}
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
                {loadingUgEnroll ? 'Enrolling UG...' : 'Enroll UG Students'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;