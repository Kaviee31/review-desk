import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'; // Import Firestore functions for querying users
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function HODDashboard() {
  const [username, setUsername] = useState('HOD');
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const navigate = useNavigate();

  const allPrograms = ["MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(SS)"];
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
            if (userData.profession === "HOD") {
              setUsername(userData.username || 'HOD');
              toast.success(`Welcome, HOD ${userData.username}!`);
            } else {
              toast.error("Access Denied: You are not authorized to view the HOD Dashboard.");
              navigate("/");
            }
          } else {
            toast.error("User profile not found. Please re-login.");
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
        toast.info("Please log in to access the HOD Dashboard.");
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Function to fetch students for the selected program and enrich with teacher's username
  const fetchStudentsByProgram = async (programName) => {
    setLoadingStudents(true);
    setStudents([]);
    try {
      const response = await axios.get(`${API_BASE_URL}/students-by-program/${programName}`);
      let fetchedStudents = response.data;

      // Create a map to store teacher usernames by email to avoid duplicate Firestore reads
      const teacherUsernamesCache = new Map();

      // Iterate through students and fetch teacher's username from Firestore
      const studentsWithTeacherNames = await Promise.all(fetchedStudents.map(async (student) => {
        let teacherDisplayName = 'N/A';
        if (student.teacherEmail) {
          // Check cache first
          if (teacherUsernamesCache.has(student.teacherEmail)) {
            teacherDisplayName = teacherUsernamesCache.get(student.teacherEmail);
          } else {
            // Fetch teacher's username from Firestore 'users' collection
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", student.teacherEmail), where("profession", "in", ["Guide", "Admin", "HOD"])); // Include all faculty types
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const teacherData = querySnapshot.docs[0].data();
              teacherDisplayName = teacherData.username || student.teacherEmail; // Fallback to email if username not set
              teacherUsernamesCache.set(student.teacherEmail, teacherDisplayName); // Cache it
            } else {
              console.warn(`Teacher user not found for email: ${student.teacherEmail}`);
              teacherDisplayName = student.teacherEmail; // Display email if user not found in Firestore
            }
          }
        }

        return {
          ...student,
          marks1: student.Assessment1 || 0,
          marks2: student.Assessment2 || 0,
          marks3: student.Assessment3 || 0,
          marks4: student.Total || 0,
          teacherDisplayName: teacherDisplayName, // Add the fetched teacher's username
        };
      }));

      setStudents(studentsWithTeacherNames);
      if (studentsWithTeacherNames.length === 0) {
        toast.info(`No students found for ${programName}.`);
      } else {
        toast.success(`Loaded ${studentsWithTeacherNames.length} students for ${programName}.`);
      }
    } catch (error) {
      console.error(`Error fetching students for ${programName}:`, error);
      toast.error(`Failed to load students for ${programName}.`);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Handle program button click
  const handleProgramClick = (program) => {
    setSelectedProgram(program);
    fetchStudentsByProgram(program);
  };

  if (loadingUser) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-xl text-gray-700">Loading HOD Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="hod-dashboard-container p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">HOD Dashboard</h1>
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-4xl text-center">
        <p className="text-2xl text-gray-700 mb-4">
          Welcome, <span className="font-semibold text-blue-600">{username}</span>!
        </p>
        <p className="text-lg text-gray-600 mb-6">
          Select a program to view enrolled students and their assessment marks.
        </p>

        {/* Program Selection Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {allPrograms.map((program) => (
            <button
              key={program}
              onClick={() => handleProgramClick(program)}
              className={`font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75
                ${selectedProgram === program ? "bg-indigo-700 text-white" : "bg-indigo-500 hover:bg-indigo-600 text-white"}
              `}
            >
              {program}
            </button>
          ))}
        </div>

        {/* Student List Display */}
        {selectedProgram && (
          <div className="mt-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Students for {selectedProgram}</h3>
            {loadingStudents ? (
              <div className="flex justify-center items-center h-40">
                <p className="text-lg text-blue-600">Loading students...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                  <thead className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal">
                    <tr>
                      <th className="py-3 px-6 text-left border-b border-gray-300">Register Number</th>
                      <th className="py-3 px-6 text-left border-b border-gray-300">Student Name</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 1</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 2</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 3</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Overall Average</th>
                      <th className="py-3 px-6 text-left border-b border-gray-300">Assigned Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm font-light">
                    {students.length > 0 ? (
                      students.map((student) => (
                        <tr key={student.registerNumber} className="border-b border-gray-200 hover:bg-gray-100">
                          <td className="py-3 px-6 text-left whitespace-nowrap">{student.registerNumber}</td>
                          <td className="py-3 px-6 text-left whitespace-nowrap">{student.studentName}</td>
                          <td className="py-3 px-6 text-center">{student.marks1}</td>
                          <td className="py-3 px-6 text-center">{student.marks2}</td>
                          <td className="py-3 px-6 text-center">{student.marks3}</td>
                          <td className="py-3 px-6 text-center">{student.marks4}</td>
                          <td className="py-3 px-6 text-left">{student.teacherDisplayName}</td> {/* Display teacher's actual username */}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-4 text-center text-gray-500">
                          No students found for this program.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => {
                  setSelectedProgram(null);
                  setStudents([]);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
              >
                Select Another Program
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default HODDashboard;
