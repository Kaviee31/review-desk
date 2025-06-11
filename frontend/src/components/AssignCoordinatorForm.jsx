import React, { useState } from 'react';
import emailjs from '@emailjs/browser';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/AdminDashboard.css'; // Assuming basic styles exist

function AssignCoordinatorForm() {
  const [guideEmailId, setGuideEmailId] = useState('');
  const [guideName, setGuideName] = useState('');
  const [branchName, setBranchName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const emailParams = {
        to_email: guideEmailId,
        to_name: guideName,
        message: `Hello ${guideName},\n\nYou have been assigned as a coordinator for the ${branchName} branch.`,
      };

      await emailjs.send(
        'service_zdkw9wb',
        'template_j69ex9q',
        emailParams,
        'lBI3Htk5CKshSzMFg'
      );

      toast.success(`📧 Email sent to ${guideName} at ${guideEmailId}`);
      setGuideEmailId('');
      setGuideName('');
      setBranchName('');
    } catch (error) {
      console.error(error);
      toast.error('❌ Failed to send coordinator email.');
    }
  };

  return (
    <div className="cont">
      <div className="dashboard-content">
        <h2>Assign Coordinator</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="guideEmailId">Guide Email ID:</label>
          <input
            type="email"
            id="guideEmailId"
            value={guideEmailId}
            onChange={(e) => setGuideEmailId(e.target.value)}
            required
          />

          <label htmlFor="guideName">Guide Name:</label>
          <input
            type="text"
            id="guideName"
            value={guideName}
            onChange={(e) => setGuideName(e.target.value)}
            required
          />

          <label htmlFor="branchName">Branch Name:</label>
          <input
            type="text"
            id="branchName"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            required
          />

          <button type="submit">Assign Coordinator</button>
        </form>
      </div>
    </div>
  );
}

export default AssignCoordinatorForm;
