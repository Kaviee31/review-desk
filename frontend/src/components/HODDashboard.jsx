import React, { useEffect, useState, useRef } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

  const firstRender = useRef(true); // ✅ Prevent multiple toasts

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
              if (firstRender.current) {
                
                firstRender.current = false;
              }
            } else {
              toast.error("Access Denied: You are not authorized.");
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
        toast.info("Please log in to access the HOD Dashboard.");
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

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
            const q = query(usersRef, where("email", "==", student.teacherEmail), where("profession", "in", ["Guide", "Admin", "HOD"]));
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
      if (studentsWithTeacherNames.length === 0) {
        toast.info(`No students found for ${programName}.`);
      } else {
        toast.success(`Loaded ${studentsWithTeacherNames.length} students for ${programName}.`);
      }
    } catch (error) {
      console.error(`Error fetching students for ${programName}:`, error);
      toast.error(`Failed to load students for ${programName}.`);
    } finally {
      setLoadingStudents(false);
    }
  };

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
        <p className="text-lg text-gray-600 mb-6">Select a program to view enrolled students and their assessment marks.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {allPrograms.map((program) => (
            <button key={program} onClick={() => handleProgramClick(program)}
              className={`font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 transform hover:scale-105 
                ${selectedProgram === program ? "bg-indigo-700 text-white" : "bg-indigo-500 hover:bg-indigo-600 text-white"}`}>
              {program}
            </button>
          ))}
        </div>

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
                      <th className="py-3 px-6 text-left">Register Number</th>
                      <th className="py-3 px-6 text-left">Student Name</th>
                      <th className="py-3 px-6 text-center">Assessment 1</th>
                      <th className="py-3 px-6 text-center">Assessment 2</th>
                      <th className="py-3 px-6 text-center">Assessment 3</th>
                      <th className="py-3 px-6 text-center">Total</th>
                      <th className="py-3 px-6 text-left">Assigned Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm font-light">
                    {students.length > 0 ? students.map((student) => (
                      <tr key={student.registerNumber} className="border-b hover:bg-gray-100">
                        <td className="py-3 px-6">{student.registerNumber}</td>
                        <td className="py-3 px-6">{student.studentName}</td>
                        <td className="py-3 px-6 text-center">{student.marks1}</td>
                        <td className="py-3 px-6 text-center">{student.marks2}</td>
                        <td className="py-3 px-6 text-center">{student.marks3}</td>
                        <td className="py-3 px-6 text-center">{student.marks4}</td>
                        <td className="py-3 px-6">{student.teacherDisplayName}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" className="py-4 text-center text-gray-500">No students found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-center mt-6">
              <button onClick={() => { setSelectedProgram(null); setStudents([]); }}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md">
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
