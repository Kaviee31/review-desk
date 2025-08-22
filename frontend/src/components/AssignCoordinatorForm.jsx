import React, { useState } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';
import {
  collection, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion
} from 'firebase/firestore';
import emailjs from 'emailjs-com';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/AssignCoordinatorForm.css';
import Footer from './Footer';

import { pgCourses, ugCourses, courses } from "../constants/courses";
function AssignCoordinatorForm() {
  const [guideEmailId, setGuideEmailId] = useState('');
  const [guideName, setGuideName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(false);

 

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!guideEmailId || !guideName || !selectedCourse) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    const password = generatePassword();
    
try {
      const usersRef = collection(db, "users");

      // --- NEW: Check if the email belongs to an existing student ---
      const studentQuery = query(usersRef, where("email", "==", guideEmailId));
      const studentSnapshot = await getDocs(studentQuery);

      if (!studentSnapshot.empty) {
        const existingUserData = studentSnapshot.docs[0].data();
        if (Array.isArray(existingUserData.roles) && existingUserData.roles.includes("Student")) {
          toast.error(`Cannot assign ${guideEmailId} as a coordinator. This email is already registered as a student.`);
          setLoading(false);
          return;
        }
      }
      // --- END NEW CHECK ---

      // --- Existing logic for unique coordinator per course ---
      // Query only for documents where 'roles' array contains "Coordinator"
      const q = query(usersRef, where("roles", "array-contains", "Coordinator"));
      const querySnapshot = await getDocs(q);

      let existingCoordinatorForCourse = null;
      if (!querySnapshot.empty) {
        // Client-side filtering to find if a coordinator is already assigned to this specific course
        existingCoordinatorForCourse = querySnapshot.docs.find(doc => {
          const data = doc.data();
          // Check if 'department' field exists, is an array, and includes selectedCourse
          return Array.isArray(data.department) && data.department.includes(selectedCourse);
        });

        if (existingCoordinatorForCourse) {
          const existingCoordinatorData = existingCoordinatorForCourse.data();
          if (existingCoordinatorData.email !== guideEmailId) {
            toast.error(`A coordinator is already assigned to ${selectedCourse}: ${existingCoordinatorData.email}.`);
            setLoading(false);
            return;
          }
        }
      }
      // --- End of new logic ---

      // Try creating new user directly
      let user = null;
      let isNewUser = false; // Flag to check if a new user was created
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, guideEmailId, password);
        user = userCredential.user;
        isNewUser = true;
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          // If email already in use, find the user in Firestore
          const qExisting = query(usersRef, where("email", "==", guideEmailId));
          const querySnapshotExisting = await getDocs(qExisting);
          if (!querySnapshotExisting.empty) {
            user = querySnapshotExisting.docs[0]; // Get the existing user document
            const userData = user.data();
            // If the user is already a coordinator for this course, prevent re-assignment
            // Also check if 'department' is an array and already contains the selectedCourse
            if (Array.isArray(userData.department) && userData.department.includes(selectedCourse) && userData.roles.includes("Coordinator")) {
              toast.info(`This user is already the coordinator for ${selectedCourse}.`);
              setLoading(false);
              return;
            }
          } else {
            toast.error('User found in Auth but not in Firestore. Cannot assign role.');
            setLoading(false);
            return;
          }
        } else {
          throw authError; // Re-throw other authentication errors
        }
      }

      if (user) {
        let userId = isNewUser ? user.uid : user.id; // Use uid for new user, id for existing doc
        let currentRoles = existingCoordinatorForCourse?.data()?.roles || []; // Get existing roles if coordinator exists for this course

        if (isNewUser) {
          await setDoc(doc(db, "users", userId), {
            username: guideName,
            email: guideEmailId,
            department: [selectedCourse], // Ensure department is an array
            roles: ["Coordinator"]
          });
          await sendEmailVerification(user); // Send verification for new user

          const emailParams = {
            to_name: guideName,
            to_email: guideEmailId,
            message: `Hello ${guideName},

You have been assigned as Coordinator for the ${selectedCourse} program.

Your login credentials are:
Email: ${guideEmailId}
Password: ${password}

Please log in and change your password after your first login.`
          };

          await emailjs.send(
            'service_zdkw9wb',
            'template_j69ex9q',
            emailParams,
            'lBI3Htk5CKshSzMFg'
          );

          toast.success(`New Coordinator created and email sent to ${guideEmailId}`);
        } else {
          // Update existing user: add "Coordinator" role and selectedCourse to department array
          const userRef = doc(db, "users", userId);
          await updateDoc(userRef, {
            username: guideName, // Update name in case it changed
            // Use arrayUnion to add selectedCourse to department if it's not already there
            department: arrayUnion(selectedCourse),
            // Use arrayUnion to add "Coordinator" role if it's not already there
            roles: arrayUnion("Coordinator")
          });

          const emailParams = {
            to_name: guideName,
            to_email: guideEmailId,
            message: `Hello ${guideName},

You have been assigned as Coordinator for the ${selectedCourse} program.

Please login using your existing credentials.`
          };

          await emailjs.send(
            'service_zdkw9wb',
            'template_j69ex9q',
            emailParams,
            'lBI3Htk5CKshSzMFg'
          );

          toast.success(`Existing user updated and email sent to ${guideEmailId}`);
        }
      }
    } catch (error) {
      console.error("Error assigning coordinator:", error);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
      setGuideEmailId('');
      setGuideName('');
      setSelectedCourse('');
    }
  };

  return (
    <div className='teacher-dashboard-layout'>
    <div className="assign-coordinator-container">
      <h2>Assign Coordinator</h2>
      <form className="assign-coordinator-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email ID:</label>
          <input
            type="email"
            value={guideEmailId}
            onChange={(e) => setGuideEmailId(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            value={guideName}
            onChange={(e) => setGuideName(e.target.value)}
            required
          />
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

        <button type="submit" disabled={loading}>
          {loading ? "Assigning..." : "Assign Coordinator"}
        </button>
      </form>
    </div>
    <Footer />
    </div>
  );
}

export default AssignCoordinatorForm;