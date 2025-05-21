import React, { useState, useEffect } from 'react';
 import '../styles/AdminDashboard.css'; // Use the same CSS for styling
 import axios from 'axios';

 function ReportPage() {
    useEffect(() => {
              document.title = "Report page";
          }, []);
     const [zerothReviewDate, setZerothReviewDate] = useState('');
     const [firstReviewDate, setFirstReviewDate] = useState('');
     const [secondReviewDate, setSecondReviewDate] = useState('');
     const [error, setError] = useState('');

     useEffect(() => {
         const fetchReviewDates = async () => {
             try {
                 const response = await axios.get("http://localhost:5000/get-review-dates");
                 if (response.data) {
                     setZerothReviewDate(response.data.zerothReviewDeadline ? new Date(response.data.zerothReviewDeadline).toISOString().split('T')[0] : '');
                     setFirstReviewDate(response.data.firstReviewDeadline ? new Date(response.data.firstReviewDeadline).toISOString().split('T')[0] : '');
                     setSecondReviewDate(response.data.secondReviewDeadline ? new Date(response.data.secondReviewDeadline).toISOString().split('T')[0] : '');
                 }
             } catch (error) {
                 console.error("Error fetching review dates:", error);
                 alert("Failed to load review dates.");
             }
         };

         fetchReviewDates();
     }, []);

     const handleSetReviewDates = async () => {
         setError(''); // Clear any previous errors

         if (!zerothReviewDate) {
             setError('Zeroth Review Deadline is required.');
             return;
         }

         if (firstReviewDate && new Date(firstReviewDate) <= new Date(zerothReviewDate)) {
             setError('First Review Deadline must be after Zeroth Review Deadline.');
             return;
         }

         if (secondReviewDate && firstReviewDate && new Date(secondReviewDate) <= new Date(firstReviewDate)) {
              setError('Second Review Deadline must be after First Review Deadline.');
              return;
         }

         try {
             const response = await axios.post("http://localhost:5000/set-review-dates", {
                 zerothReviewDeadline: zerothReviewDate,
                 firstReviewDeadline: firstReviewDate,
                 secondReviewDeadline: secondReviewDate,
             });
             alert(response.data.message || "Review dates set successfully!");
         } catch (error) {
             alert(error.response?.data?.error || "Error setting review dates");
         }
     };

     return (
         <div className='cont'>
             <div className="dashboard-content">
                 <h2>Set Review Deadlines</h2>
                 {error && <p className="error-message">{error}</p>}
                 <form onSubmit={(e) => { e.preventDefault(); handleSetReviewDates(); }}>
                     <div>
                         <label htmlFor="zerothReviewDate">Zeroth Review Deadline:</label>
                         <input
                             type="date"
                             id="zerothReviewDate"
                             value={zerothReviewDate}
                             onChange={(e) => setZerothReviewDate(e.target.value)}
                             required
                         />
                     </div>
                     <div>
                         <label htmlFor="firstReviewDate">First Review Deadline:</label>
                         <input
                             type="date"
                             id="firstReviewDate"
                             value={firstReviewDate}
                             onChange={(e) => setFirstReviewDate(e.target.value)}
                         />
                     </div>
                     <div>
                         <label htmlFor="secondReviewDate">Second Review Deadline:</label>
                         <input
                             type="date"
                             id="secondReviewDate"
                             value={secondReviewDate}
                             onChange={(e) => setSecondReviewDate(e.target.value)}
                         />
                     </div>
                     <button type="submit">Set Deadlines</button>
                 </form>
             </div>
         </div>
     );
 }

 export default ReportPage;