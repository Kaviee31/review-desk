import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion
} from 'firebase/firestore';
import emailjs from 'emailjs-com';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/AssignCoordinatorForm.css';
import Footer from './Footer';
import { courses } from "../constants/courses";

function AssignCoordinatorForm() {
  // State for the list of teachers and the selected teacher/course
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  // Loading states for fetching teachers and submitting the form
  const [loading, setLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(true);

  // Fetch all teachers from Firestore when the component mounts
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const usersRef = collection(db, "users");
        // Query for users who have "Teacher" in their 'roles' array
        const q = query(usersRef, where("roles", "array-contains", "Teacher"));
        const querySnapshot = await getDocs(q);

        const teachersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setTeachers(teachersList);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        toast.error("Could not load the list of teachers.");
      } finally {
        setTeachersLoading(false);
      }
    };

    fetchTeachers();
  }, []); // The empty array ensures this runs only once on mount

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTeacherId || !selectedCourse) {
      toast.error('Please select a teacher and a course');
      return;
    }

    setLoading(true);

    try {
      // Find the full teacher object from the state using the selected ID
      const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
      if (!selectedTeacher) {
        toast.error("Selected teacher not found.");
        setLoading(false);
        return;
      }

      const { email: guideEmailId, username: guideName, id: userId } = selectedTeacher;

const usersRef = collection(db, "users");
      const q = query(usersRef, where("roles", "array-contains", "Coordinator"));
      const querySnapshot = await getDocs(q);

      // Then, filter those results in your code to find one matching the selected course
      const existingCoordinatorDoc = querySnapshot.docs.find(doc => 
        doc.data().department && doc.data().department.includes(selectedCourse)
      );

      if (existingCoordinatorDoc) {
        const existingCoordinator = existingCoordinatorDoc.data();
        // If a coordinator for this course exists and it's not the same teacher
        if (existingCoordinator.email !== guideEmailId) {
          toast.error(`Course ${selectedCourse} is already assigned to ${existingCoordinator.username}.`);
          setLoading(false);
          return;
        }
      }

      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      // Check if the teacher is already a coordinator for this specific course
      if (Array.isArray(userData.department) && userData.department.includes(selectedCourse) && userData.roles.includes("Coordinator")) {
        toast.info(`${guideName} is already the coordinator for ${selectedCourse}.`);
        setLoading(false);
        return;
      }

      // Update the teacher's document to add the new role and course
      await updateDoc(userRef, {
        department: arrayUnion(selectedCourse),
        roles: arrayUnion("Coordinator")
      });

      // Send an email notification
      const emailParams = {
        to_name: guideName,
        to_email: guideEmailId,
        message: `Hello ${guideName},\n\nYou have been assigned as a Coordinator for the ${selectedCourse} program.\n\nPlease log in with your existing credentials to see your new role.`
      };

      await emailjs.send(
        'service_zdkw9wb', 'template_j69ex9q', emailParams, 'lBI3Htk5CKshSzMFg'
      );

      toast.success(`${guideName} has been successfully assigned as Coordinator for ${selectedCourse}.`);

    } catch (error) {
      console.error("Error assigning coordinator:", error);
      toast.error(`Failed to assign coordinator: ${error.message}`);
    } finally {
      setLoading(false);
      setSelectedTeacherId('');
      setSelectedCourse('');
    }
  };

  return (
    <div className='teacher-dashboard-layout'>
      <div className="assign-coordinator-container">
        <h2>Assign Coordinator</h2>
        <form className="assign-coordinator-form" onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Teacher:</label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              required
              disabled={teachersLoading}
            >
              <option value="">
                {teachersLoading ? "Loading teachers..." : "Select a Teacher"}
              </option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.username} ({teacher.facultyId || 'No ID'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Course:</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              required
            >
              <option value="">Select a Course</option>
              {courses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading || teachersLoading}>
            {loading ? "Assigning..." : "Assign Coordinator"}
          </button>
        </form>
      </div>
      <div className='footer-st'>
        <Footer />
      </div>
      
    </div>
  );
}

export default AssignCoordinatorForm;