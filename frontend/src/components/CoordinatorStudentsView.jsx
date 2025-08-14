import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { toast } from 'react-toastify';

function CoordinatorStudentsView() {
  const [coordinatorUid, setCoordinatorUid] = useState(null);
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [selectedProgram, setSelectedProgram] = useState(null);
  const [students, setStudents] = useState([]); // For PG students
  const [ugProjects, setUgProjects] = useState([]); // State for UG projects (main table)
  const [ugCurrentView, setUgCurrentView] = useState('projects'); // 'projects' or 'students_in_project'
  const [selectedProject, setSelectedProject] = useState(null);
  const [studentsInSelectedProject, setStudentsInSelectedProject] = useState([]);

  // Review Deadlines State - Added thirdReviewDeadline
  const [reviewDeadlines, setReviewDeadlines] = useState({
    zerothReviewDeadline: null,
    firstReviewDeadline: null,
    secondReviewDeadline: null,
    thirdReviewDeadline: null,
  });

  const [latestReviewFiles, setLatestReviewFiles] = useState({});

  const API_BASE_URL = "http://localhost:5000";
  const pgPrograms = ["MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(SS)"];
  const ugPrograms = ["B.TECH(IT)", "B.TECH(IT) SS"];

  useEffect(() => {
    document.title = "Coordinator View Students";
  }, []);

  // Effect to fetch coordinator's assigned courses
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCoordinatorUid(user.uid);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const departments = Array.isArray(userData.department) ? userData.department : [userData.department];
            setAssignedCourses(departments);
          } else {
            toast.warn("No coordinator document found or no assigned departments.");
            setAssignedCourses([]);
          }
        } catch (error) {
          console.error("Error fetching coordinator data:", error);
          toast.error("Failed to load assigned courses.");
        } finally {
          setLoadingCourses(false);
        }
      } else {
        setAssignedCourses([]);
        setCoordinatorUid(null);
        setLoadingCourses(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Function to fetch review deadlines, now includes third review
  const fetchReviewDeadlines = useCallback(async (courseName) => {
    if (!courseName) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/get-review-dates?courseName=${courseName}`);
      setReviewDeadlines({
        zerothReviewDeadline: response.data?.zerothReviewDeadline || null,
        firstReviewDeadline: response.data?.firstReviewDeadline || null,
        secondReviewDeadline: response.data?.secondReviewDeadline || null,
        thirdReviewDeadline: response.data?.thirdReviewDeadline || null,
      });
    } catch (error) {
      console.error("Error fetching review deadlines:", error);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    if (selectedProgram) {
      fetchReviewDeadlines(selectedProgram);
    }
  }, [selectedProgram, fetchReviewDeadlines]);

  // Function to fetch students for a selected PG program
  const fetchPgStudents = async (program) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/students-by-program/${program}`);
      const updatedStudents = response.data.map((student) => ({
        ...student,
        marks1: student.Assessment1 || 0,
        marks2: student.Assessment2 || 0,
        marks3: student.Assessment3 || 0,
        marks4: student.Total || 0,
      }));
      updatedStudents.sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
      setStudents(updatedStudents);
    } catch (err) {
      console.error(`Error fetching students for ${program}:`, err);
      setStudents([]);
      toast.error(`Failed to fetch students for ${program}.`);
    }
  };

  // Function to fetch UG projects for a selected UG program
  const fetchUgProjects = async (program) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ug-projects-by-program/${program}`);
      setUgProjects(response.data);
    } catch (err) {
      console.error(`Error fetching UG projects for ${program}:`, err);
      setUgProjects([]);
      toast.error(`Failed to fetch UG projects for ${program}.`);
    }
  };

  useEffect(() => {
    if (selectedProgram) {
      if (pgPrograms.includes(selectedProgram)) {
        fetchPgStudents(selectedProgram);
        setUgProjects([]);
        setUgCurrentView('projects');
      } else if (ugPrograms.includes(selectedProgram)) {
        fetchUgProjects(selectedProgram);
        setStudents([]);
        setUgCurrentView('projects');
      }
    } else {
      setStudents([]);
      setUgProjects([]);
      setUgCurrentView('projects');
    }
  }, [selectedProgram]);

  // Fetch latest review files, now includes third review
  const fetchLatestReviewFiles = async (studentList) => {
    if (!studentList || studentList.length === 0) return;
    const files = {};
    for (const student of studentList) {
      for (const reviewType of ["zeroth", "first", "second", "third"]) {
        try {
          const response = await axios.get(`${API_BASE_URL}/get-latest-review/${student.registerNumber}/${reviewType}`);
          files[`${student.registerNumber}_${reviewType}`] = response.data;
        } catch (error) {
          files[`${student.registerNumber}_${reviewType}`] = { pdfPath: null, pptPath: null, otherPath: null, uploadedAt: null };
        }
      }
    }
    setLatestReviewFiles(files);
  };

  // Updated useEffect to fetch files for all UG students when projects are loaded
  useEffect(() => {
    if (pgPrograms.includes(selectedProgram) && students.length > 0) {
      fetchLatestReviewFiles(students);
    } else if (ugPrograms.includes(selectedProgram) && ugProjects.length > 0) {
      // FIX: Make the logic resilient to missing projectMembers by creating a list of mock students from groupRegisterNumbers
      const allUgStudents = ugProjects.flatMap(project => {
        if (project.projectMembers && project.projectMembers.length > 0) {
          return project.projectMembers;
        }
        if (project.groupRegisterNumbers && project.groupRegisterNumbers.length > 0) {
          return project.groupRegisterNumbers.map(regNo => ({ registerNumber: regNo }));
        }
        return [];
      });

      if (allUgStudents.length > 0) {
        fetchLatestReviewFiles(allUgStudents);
      }
    } else {
      setLatestReviewFiles({});
    }
  }, [students, ugProjects, selectedProgram]);


  const handleViewProjectStudents = (project) => {
    setSelectedProject(project);
    let members = [];
    // FIX: Handle cases where backend sends incomplete data
    if (Array.isArray(project.projectMembers) && project.projectMembers.length > 0) {
      members = project.projectMembers;
    } else if (Array.isArray(project.groupRegisterNumbers)) {
      toast.warn("Student names not available. Backend data for project members might be incomplete.");
      members = project.groupRegisterNumbers.map(regNo => ({
        registerNumber: regNo,
        studentName: 'N/A',
        Assessment1: project.Assessment1,
        Assessment2: project.Assessment2,
        Assessment3: project.Assessment3,
        Total: project.Total || ((project.Assessment1 || 0) + (project.Assessment2 || 0) + (project.Assessment3 || 0)) / 3,
      }));
    }

    setStudentsInSelectedProject(members.sort((a, b) => a.registerNumber.localeCompare(b.registerNumber)));
    setUgCurrentView('students_in_project');
  };

  const handleBackToProjects = () => {
    setUgCurrentView('projects');
    setSelectedProject(null);
    setStudentsInSelectedProject([]);
  };

  const calculateDaysLate = (uploadedAt, deadline) => {
    if (!uploadedAt || !deadline) return null;
    const uploadDate = new Date(uploadedAt);
    const deadlineDate = new Date(deadline);
    uploadDate.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    if (uploadDate > deadlineDate) {
      const diffTime = Math.abs(uploadDate - deadlineDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} day(s) late`;
    }
    return "On Time";
  };
  
  // Helper to render a review cell for an individual student (PG or UG-detail view)
  const renderStudentReviewCell = (student, reviewType, deadline) => {
    const fileData = latestReviewFiles[`${student.registerNumber}_${reviewType}`];
    const hasFiles = fileData?.pdfPath || fileData?.pptPath || fileData?.otherPath;
  
    return (
      <td className="py-3 px-6 text-center">
        {fileData?.pdfPath && (<a href={`${API_BASE_URL}/${fileData.pdfPath}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline block">PDF</a>)}
        {fileData?.pptPath && (<a href={`${API_BASE_URL}/${fileData.pptPath}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline block mt-1">PPT</a>)}
        {fileData?.otherPath && (<a href={`${API_BASE_URL}/${fileData.otherPath}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline block mt-1">Other</a>)}
        {!hasFiles ? (<span className="text-gray-500 text-xs">No Files</span>) : (
          <span className={`block mt-1 text-xs ${calculateDaysLate(fileData?.uploadedAt, deadline)?.includes('late') ? 'text-red-500' : 'text-green-600'}`}>
            {calculateDaysLate(fileData?.uploadedAt, deadline)}
          </span>
        )}
      </td>
    );
  };

  // Helper to render a review cell for a whole UG project in the main table
  const renderProjectReviewCell = (project, reviewType, deadline) => {
    // FIX: Use groupRegisterNumbers as a fallback to find the first member for checking files.
    const firstMemberRegNo = project.projectMembers?.[0]?.registerNumber || project.groupRegisterNumbers?.[0];
    if (!firstMemberRegNo) {
      return <td className="py-3 px-6 text-center"><span className="text-gray-500 text-xs">No Members</span></td>;
    }
    // For UG projects, we assume one submission for the group, so we check the first member.
    const mockStudent = { registerNumber: firstMemberRegNo };
    return renderStudentReviewCell(mockStudent, reviewType, deadline);
  };

  if (loadingCourses) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-700">Loading assigned courses...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 bg-gray-100 font-inter">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Coordinator Student View
      </h1>

      {!selectedProgram && (
        <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-xl" role="main">
          <h2 className="text-2xl font-bold mb-4 text-gray-700">Select an Assigned Course</h2>
          {assignedCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedCourses.map((program) => (
                <button
                  key={program}
                  onClick={() => setSelectedProgram(program)}
                  className={`font-semibold py-4 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75
                    ${pgPrograms.includes(program) ?
                      (program === "MCA(R)" ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500" :
                        program === "MCA(SS)" ? "bg-green-600 hover:bg-green-700 focus:ring-green-500" :
                          program === "MTECH(R)" ? "bg-purple-600 hover:bg-purple-700 focus:ring-purple-500" :
                            "bg-red-600 hover:bg-red-700 focus:ring-red-500") :
                      (ugPrograms.includes(program) ? "bg-orange-500 hover:bg-orange-600 focus:ring-orange-400" : "")
                    } text-white`}
                >
                  {program}
                </button>
              ))}
            </div>
          ) : (<p className="text-gray-500 text-center">No courses assigned to you as a coordinator.</p>)}
        </div>
      )}

      {selectedProgram && (
        <div className="w-full max-w-7xl bg-white p-6 rounded-lg shadow-xl" role="main">
          {/* Display for PG Students */}
          {pgPrograms.includes(selectedProgram) && (
            <>
              <h2 className="text-2xl font-bold mb-4 text-gray-700">Students List for {selectedProgram}</h2>
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
                      <th className="py-3 px-6 text-center border-b border-gray-300">Third Review</th>
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
                          {renderStudentReviewCell(student, "zeroth", reviewDeadlines.zerothReviewDeadline)}
                          {renderStudentReviewCell(student, "first", reviewDeadlines.firstReviewDeadline)}
                          {renderStudentReviewCell(student, "second", reviewDeadlines.secondReviewDeadline)}
                          {renderStudentReviewCell(student, "third", reviewDeadlines.thirdReviewDeadline)}
                        </tr>
                      ))
                    ) : (<tr><td colSpan="10" className="py-4 text-center text-gray-500">No PG students enrolled in this program yet.</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Display for UG Projects */}
          {ugPrograms.includes(selectedProgram) && ugCurrentView === 'projects' && (
            <>
              <h2 className="text-2xl font-bold mb-4 text-gray-700">Projects List for {selectedProgram}</h2>
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                  <thead className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal">
                    <tr>
                      <th className="py-3 px-6 text-left border-b border-gray-300">Project Name</th>
                      <th className="py-3 px-6 text-left border-b border-gray-300">Register Numbers</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 1</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 2</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Assessment 3</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Zeroth Review</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">First Review</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Second Review</th>
                      <th className="py-3 px-6 text-center border-b border-gray-300">Third Review</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm font-light">
                    {ugProjects.length > 0 ? (
                      ugProjects.map((project) => (
                        <tr key={project.projectName} className="border-b border-gray-200 hover:bg-gray-100">
                          <td className="py-3 px-6 text-left whitespace-nowrap"><span className="text-blue-600 hover:underline cursor-pointer font-medium" onClick={() => handleViewProjectStudents(project)}>{project.projectName}</span></td>
                          <td className="py-3 px-6 text-left">{project.groupRegisterNumbers.join(', ')}</td>
                          <td className="py-3 px-6 text-center">{project.Assessment1 || 0}</td>
                          <td className="py-3 px-6 text-center">{project.Assessment2 || 0}</td>
                          <td className="py-3 px-6 text-center">{project.Assessment3 || 0}</td>
                          {renderProjectReviewCell(project, "zeroth", reviewDeadlines.zerothReviewDeadline)}
                          {renderProjectReviewCell(project, "first", reviewDeadlines.firstReviewDeadline)}
                          {renderProjectReviewCell(project, "second", reviewDeadlines.secondReviewDeadline)}
                          {renderProjectReviewCell(project, "third", reviewDeadlines.thirdReviewDeadline)}
                        </tr>
                      ))
                    ) : (<tr><td colSpan="9" className="py-4 text-center text-gray-500">No UG projects found for this program.</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Display for Students within a Selected UG Project */}
          {ugPrograms.includes(selectedProgram) && ugCurrentView === 'students_in_project' && selectedProject && (
            <>
              <h2 className="text-2xl font-bold mb-4 text-gray-700">Students in Project: {selectedProject.projectName}</h2>
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
                      <th className="py-3 px-6 text-center border-b border-gray-300">Third Review</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm font-light">
                    {studentsInSelectedProject.length > 0 ? (
                      studentsInSelectedProject.map((student) => (
                        <tr key={student.registerNumber} className="border-b border-gray-200 hover:bg-gray-100">
                          <td className="py-3 px-6 text-left whitespace-nowrap">{student.registerNumber}</td>
                          <td className="py-3 px-6 text-left whitespace-nowrap">{student.studentName}</td>
                          <td className="py-3 px-6 text-center">{student.Assessment1 || 0}</td>
                          <td className="py-3 px-6 text-center">{student.Assessment2 || 0}</td>
                          <td className="py-3 px-6 text-center">{student.Assessment3 || 0}</td>
                          <td className="py-3 px-6 text-center">{student.Total || 0}</td>
                          {renderStudentReviewCell(student, "zeroth", reviewDeadlines.zerothReviewDeadline)}
                          {renderStudentReviewCell(student, "first", reviewDeadlines.firstReviewDeadline)}
                          {renderStudentReviewCell(student, "second", reviewDeadlines.secondReviewDeadline)}
                          {renderStudentReviewCell(student, "third", reviewDeadlines.thirdReviewDeadline)}
                        </tr>
                      ))
                    ) : (<tr><td colSpan="10" className="py-4 text-center text-gray-500">No students found in this project.</td></tr>)}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-center mt-6">
                <button onClick={handleBackToProjects} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75">Back to Projects</button>
              </div>
            </>
          )}

          {(!ugPrograms.includes(selectedProgram) || (ugPrograms.includes(selectedProgram) && ugCurrentView === 'projects')) && (
            <div className="flex justify-center mt-8">
              <button onClick={() => { setSelectedProgram(null); setStudents([]); setUgProjects([]); setLatestReviewFiles({}); setUgCurrentView('projects'); setSelectedProject(null); setStudentsInSelectedProject([]); }} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75">Select Another Program</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CoordinatorStudentsView;
