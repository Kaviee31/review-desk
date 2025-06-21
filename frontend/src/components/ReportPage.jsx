import React, { useState, useEffect } from 'react';
import axios from 'axios';
import emailjs from '@emailjs/browser';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/AdminDashboard.css';

function ReportPage() {
    useEffect(() => {
        document.title = "Set Review Deadlines";
    }, []);

    const [zerothReviewDate, setZerothReviewDate] = useState('');
    const [firstReviewDate, setFirstReviewDate] = useState('');
    const [secondReviewDate, setSecondReviewDate] = useState('');
    const [loading, setLoading] = useState(false);

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
                toast.error("Failed to load review dates.");
            }
        };
        fetchReviewDates();
    }, []);

    const handleSetReviewDates = async () => {
        if (!zerothReviewDate) {
            toast.warning("Zeroth Review Deadline is required.");
            return;
        }
        if (firstReviewDate && new Date(firstReviewDate) <= new Date(zerothReviewDate)) {
            toast.warning("First Review must be after Zeroth Review.");
            return;
        }
        if (secondReviewDate && firstReviewDate && new Date(secondReviewDate) <= new Date(firstReviewDate)) {
            toast.warning("Second Review must be after First Review.");
            return;
        }

        setLoading(true);

        try {
            await axios.post("http://localhost:5000/set-review-dates", {
                zerothReviewDeadline: zerothReviewDate,
                firstReviewDeadline: firstReviewDate,
                secondReviewDeadline: secondReviewDate,
            });

            toast.success("Review deadlines updated successfully!");
            await sendEmailToAllStudents();
        } catch (error) {
            console.error("Error updating deadlines:", error);
            toast.error("Failed to set review deadlines.");
        } finally {
            setLoading(false);
        }
    };

    const sendEmailToAllStudents = async () => {
        try {
            const usersSnapshot = await getDocs(collection(db, "users"));
            const bccEmails = [];

            usersSnapshot.forEach(doc => {
                const user = doc.data();
                if (user.profession === "Student" && user.email) {
                    bccEmails.push(user.email);
                }
            });

            if (bccEmails.length === 0) {
                toast.warning("No student emails found.");
                return;
            }

            const messageBody = `
📅 Review Deadlines Updated:

🟠 Zeroth Review: ${zerothReviewDate}
🟢 First Review: ${firstReviewDate || 'Not Set'}
🔵 Second Review: ${secondReviewDate || 'Not Set'}

Please plan your reviews accordingly.
            `;

            const templateParams = {
                message: messageBody,
                to_name: "Students",
                to_email: "reviewdeskau@gmail.com",
                bcc: bccEmails.join(","),
                subject: "🔔 Review Deadlines Updated"
            };

            await emailjs.send(
                'service_zdkw9wb',
                'template_bdoxrlm',
                templateParams,
                'lBI3Htk5CKshSzMFg'
            );

            toast.success(`Email sent to ${bccEmails.length} students.`);
        } catch (error) {
            console.error("Error sending email:", error);
            toast.error("Failed to send email to students.");
        }
    };

    return (
        <div className='cont'>
            <div className="dashboard-content">
                <h2>📅 Set Review Deadlines</h2>

                <form onSubmit={(e) => { e.preventDefault(); handleSetReviewDates(); }}>
                    <div className="form-group">
                        <label>Zeroth Review Deadline:</label>
                        <input type="date" value={zerothReviewDate} onChange={(e) => setZerothReviewDate(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label>First Review Deadline:</label>
                        <input type="date" value={firstReviewDate} onChange={(e) => setFirstReviewDate(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label>Second Review Deadline:</label>
                        <input type="date" value={secondReviewDate} onChange={(e) => setSecondReviewDate(e.target.value)} />
                    </div>

                    <button type="submit" className="submit-button" disabled={loading}>
                        {loading ? "Updating..." : "Set Deadlines & Notify"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ReportPage;
