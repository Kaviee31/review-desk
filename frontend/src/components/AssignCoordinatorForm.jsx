import React, { useState } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import emailjs from 'emailjs-com';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/AdminDashboard.css'; // Assuming this CSS provides styling

function AssignCoordinatorForm() {
  const [guideEmailId, setGuideEmailId] = useState('');
  const [guideName, setGuideName] = useState('');
  // Changed from selectedDepartment to selectedCourse to be more explicit
  const [selectedCourse, setSelectedCourse] = useState(''); 

  // Define the available courses for coordinators
  const courses = ["MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(SS)"];

  // Function to generate a random password for new coordinator accounts
  const generatePassword = () => {
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior

    // Basic validation to ensure all fields are filled
    if (!guideEmailId || !guideName || !selectedCourse) {
      toast.error('Please fill all fields');
      return;
    }

    const password = generatePassword(); // Generate a password for the new coordinator

    try {
      // 1. Register the coordinator in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        guideEmailId,
        password
      );
      const user = userCredential.user;

      // 2. Store coordinator details in Firestore
      // The 'department' field now stores the specific course
      await setDoc(doc(db, 'users', user.uid), {
        email: guideEmailId,
        username: guideName,
        profession: 'Coordinator', // Assign the 'Coordinator' profession
        department: selectedCourse, // Store the assigned course here
      });

      // 3. Send email verification to the newly created user
      await sendEmailVerification(user);

      // 4. Send login credentials to the coordinator via EmailJS
      const emailParams = {
        to_name: guideName,
        to_email: guideEmailId,
        message: `Hello ${guideName},

You have been assigned as a coordinator for the ${selectedCourse} program.

Your login credentials are:
Email: ${guideEmailId}
Password: ${password}

Please log in and change your password after your first login for security.
`,
      };

      // Ensure 'emailjs.send' parameters are correctly configured for your EmailJS service
      await emailjs.send(
        'service_zdkw9wb', // Replace with your EmailJS service ID
        'template_j69ex9q', // Replace with your EmailJS template ID
        emailParams,
        'lBI3Htk5CKshSzMFg' // Replace with your EmailJS user ID (public key)
      );

      toast.success(`📧 Email sent successfully to ${guideEmailId}`);
      // Clear form fields after successful submission
      setGuideEmailId('');
      setGuideName('');
      setSelectedCourse('');
    } catch (error) {
      console.error("Error assigning coordinator:", error);
      toast.error(`❌ Failed to assign coordinator: ${error.message}`);
    }
  };

  return (
    <div className="cont">
      <div className="dashboard-content">
        <h2>Assign Coordinator</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="guideEmailId">Coordinator Email ID:</label>
          <input
            type="email"
            id="guideEmailId"
            value={guideEmailId}
            onChange={(e) => setGuideEmailId(e.target.value)}
            required
          />

          <label htmlFor="guideName">Coordinator Name:</label>
          <input
            type="text"
            id="guideName"
            value={guideName}
            onChange={(e) => setGuideName(e.target.value)}
            required
          />

          <label htmlFor="selectedCourse">Course Assigned:</label>
          <select
            id="selectedCourse"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            required
          >
            <option value="">Select a Course</option> {/* Default empty option */}
            {courses.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

          <button type="submit">Assign Coordinator</button>
        </form>
      </div>
    </div>
  );
}

export default AssignCoordinatorForm;
