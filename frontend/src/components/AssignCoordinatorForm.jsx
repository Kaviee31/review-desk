// src/components/AssignCoordinatorForm.jsx

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

function AssignCoordinatorForm() {
  const [guideEmailId, setGuideEmailId] = useState('');
  const [guideName, setGuideName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(false);

  const courses = ["MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(SS)","B.TECH(IT)","B.TECH(IT) SS"];

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
      // --- Start of new logic for unique coordinator per course ---
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("department", "==", selectedCourse), where("roles", "array-contains", "Coordinator"));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingCoordinator = querySnapshot.docs[0].data();
        if (existingCoordinator.email !== guideEmailId) {
          toast.error(`A coordinator is already assigned to ${selectedCourse}: ${existingCoordinator.email}.`);
          setLoading(false);
          return;
        }
      }
      // --- End of new logic ---

      // Try creating new user directly
      let user = null;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, guideEmailId, password);
        user = userCredential.user;
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          // If email already in use, find the user in Firestore
          const qExisting = query(usersRef, where("email", "==", guideEmailId));
          const querySnapshotExisting = await getDocs(qExisting);
          if (!querySnapshotExisting.empty) {
            user = querySnapshotExisting.docs[0]; // Get the existing user document
            // If the user is already a coordinator for this course, prevent re-assignment
            const userData = user.data();
            if (userData.department === selectedCourse && userData.roles.includes("Coordinator")) {
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


      if (user && user.uid) { // Check if user object from createUserWithEmailAndPassword
        await setDoc(doc(db, "users", user.uid), {
          username: guideName,
          email: guideEmailId,
          department: selectedCourse,
          roles: ["Coordinator"]
        });

        await sendEmailVerification(user);

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
      } else if (user && user.id) { // Check if user object from getDocs (existing user)
        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, {
          username: guideName,
          department: selectedCourse,
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


    } catch (error) {
      console.error("Error assigning coordinator:", error);
      toast.error(`Failed: ${error.message}`);
    }
    setLoading(false);
    setGuideEmailId('');
    setGuideName('');
    setSelectedCourse('');
  };

  return (
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
  );
}

export default AssignCoordinatorForm;