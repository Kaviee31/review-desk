// src/components/AssignCoordinatorForm.jsx
import React, { useState } from 'react';
// Import the AdminDashboard.css for consistent styling
import '../styles/AdminDashboard.css'; 

function AssignCoordinatorForm() {
  const [guideEmailId, setGuideEmailId] = useState('');
  const [guideName, setGuideName] = useState('');
  const [branchName, setBranchName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send this data to your backend
    console.log({
      guideEmailId,
      guideName,
      branchName,
    });
    alert('Coordinator assignment request submitted! (Check console for data)');
    // Optionally, reset the form
    setGuideEmailId('');
    setGuideName('');
    setBranchName('');
  };

  return (
    // Use app-container to get the background and overlay
    <div className="app-container"> 
      {/* Use dashboard-content for the form's glassmorphism style */}
      <div className="dashboard-content"> 
        <h1>Assign Coordinator</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="guideEmailId">Guide Email ID:</label>
          <input
            type="email"
            id="guideEmailId"
            value={guideEmailId}
            onChange={(e) => setGuideEmailId(e.target.value)}
            placeholder="Enter guide email ID"
            required
          />

          <label htmlFor="guideName">Guide Name:</label>
          <input
            type="text"
            id="guideName"
            value={guideName}
            onChange={(e) => setGuideName(e.target.value)}
            placeholder="Enter guide name"
            required
          />

          <label htmlFor="branchName">Branch Name:</label>
          <input
            type="text"
            id="branchName"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="Enter branch name"
            required
          />

          <button type="submit">Assign Coordinator</button>
        </form>
      </div>
    </div>
  );
}

export default AssignCoordinatorForm;