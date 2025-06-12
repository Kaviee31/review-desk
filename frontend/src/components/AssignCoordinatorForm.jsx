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
import '../styles/AdminDashboard.css';

function AssignCoordinatorForm() {
  const [guideEmailId, setGuideEmailId] = useState('');
  const [guideName, setGuideName] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const generatePassword = () => {
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guideEmailId || !guideName || !selectedDepartment) {
      toast.error('Please fill all fields');
      return;
    }

    const password = generatePassword();

    try {
      // 1. Register in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        guideEmailId,
        password
      );
      const user = userCredential.user;

      // 2. Store details in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: guideEmailId,
        username: guideName,
        profession: 'Coordinator',
        department: selectedDepartment,
      });

      // 3. Send email verification
      await sendEmailVerification(user);

      // 4. Send credentials via EmailJS
      const emailParams = {
        to_name: guideName,
        to_email: guideEmailId,
        message: `Hello ${guideName},

You have been assigned as a coordinator for the ${selectedDepartment} department.

Your login credentials are:
Email: ${guideEmailId}
Password: ${password}

Please log in and change your password after first login.
`,
      };

        await emailjs.send(
        'service_zdkw9wb',
        'template_j69ex9q',
        emailParams,
        'lBI3Htk5CKshSzMFg'
      );

      toast.success(`📧 Email sent successfully to ${guideEmailId}`);
      setGuideEmailId('');
      setGuideName('');
      setSelectedDepartment('');
    } catch (error) {
      console.error(error);
      toast.error(`❌ Failed: ${error.message}`);
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

          <label htmlFor="selectedDepartment">Department:</label>
          <input
            type="text"
            id="selectedDepartment"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            required
          />

          <button type="submit">Assign Coordinator</button>
        </form>
      </div>
    </div>
  );
}

export default AssignCoordinatorForm;
