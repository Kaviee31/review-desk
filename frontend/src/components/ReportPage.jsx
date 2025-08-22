import React, { useState, useEffect } from 'react';
import axios from 'axios';
import emailjs from '@emailjs/browser';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Footer from './Footer';
import '../styles/ReportPage.css'; // Assuming this CSS is for general dashboard styling
export const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL
function ReportPage() {
    useEffect(() => {
        document.title = "Set Review Deadlines";
    }, []);

    const [selectedProgram, setSelectedProgram] = useState(null); // New state for selected program
    const [zerothReviewDate, setZerothReviewDate] = useState('');
    const [firstReviewDate, setFirstReviewDate] = useState('');
    const [secondReviewDate, setSecondReviewDate] = useState('');
    const [thirdReviewDate, setThirdReviewDate] = useState(''); // NEW: State for third review date
    const [loading, setLoading] = useState(false);
    const today = new Date().toISOString().split('T')[0];

    // Define all programs
    const allPrograms = [
        "MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(AI_DS)",
        "B.TECH(IT) BATCH1", "B.TECH(IT) BATCH2"
    ];

    // Effect to fetch review dates for the selected program
    useEffect(() => {
        const fetchReviewDates = async () => {
            if (selectedProgram) {
                try {
                    const response = await axios.get(`${API_BASE_URL}/get-review-dates?courseName=${selectedProgram}`);
                    if (response.data) {
                        setZerothReviewDate(response.data.zerothReviewDeadline ? new Date(response.data.zerothReviewDeadline).toISOString().split('T')[0] : '');
                        setFirstReviewDate(response.data.firstReviewDeadline ? new Date(response.data.firstReviewDeadline).toISOString().split('T')[0] : '');
                        setSecondReviewDate(response.data.secondReviewDeadline ? new Date(response.data.secondReviewDeadline).toISOString().split('T')[0] : '');
                        setThirdReviewDate(response.data.thirdReviewDeadline ? new Date(response.data.thirdReviewDeadline).toISOString().split('T')[0] : ''); // NEW: Set third review date
                    } else {
                        // If no deadlines exist for the selected program, clear the fields
                        setZerothReviewDate('');
                        setFirstReviewDate('');
                        setSecondReviewDate('');
                        setThirdReviewDate(''); // NEW: Clear third review date
                    }
                } catch (error) {
                    console.error("Error fetching review dates:", error);
                    toast.error("Failed to load review dates for the selected program.");
                    setZerothReviewDate('');
                    setFirstReviewDate('');
                    setSecondReviewDate('');
                    setThirdReviewDate(''); // NEW: Clear third review date
                }
            }
        };
        fetchReviewDates();
    }, [selectedProgram]); // Re-run when selectedProgram changes

    const handleSetReviewDates = async () => {
        if (!selectedProgram) {
            toast.error("Please select a program first.");
            return;
        }
        if (!zerothReviewDate) {
            toast.warning("Zeroth Review Deadline is required.");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const selectedZerothDate = new Date(zerothReviewDate);

        if (selectedZerothDate < today) {
            toast.warning("Zeroth Review Deadline cannot be a past date.");
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
        // NEW: Validation for third review date
        if (thirdReviewDate && secondReviewDate && new Date(thirdReviewDate) <= new Date(secondReviewDate)) {
            toast.warning("Third Review must be after Second Review.");
            return;
        }

        setLoading(true);

        try {
            await axios.post(`${API_BASE_URL}/set-review-dates`, {
                courseName: selectedProgram, // Send selected course name
                zerothReviewDeadline: zerothReviewDate,
                firstReviewDeadline: firstReviewDate,
                secondReviewDeadline: secondReviewDate,
                thirdReviewDeadline: thirdReviewDate, // NEW: Send third review deadline
            });

            toast.success(`Review deadlines for ${selectedProgram} updated successfully!`);
            await sendEmailToStudentsByCourse(selectedProgram); // Send email to specific course students
        } catch (error) {
            console.error("Error updating deadlines:", error);
            toast.error("Failed to set review deadlines.");
        } finally {
            setLoading(false);
        }
    };

    // New function to send email to students of a specific course
    const sendEmailToStudentsByCourse = async (courseName) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/student-emails-by-course/${courseName}`);
            const bccEmails = response.data;

            if (bccEmails.length === 0) {
                toast.warning(`No student emails found for ${courseName}.`);
                return;
            }

            const messageBody = `
            📢 Review Deadlines Updated for ${courseName} Program:

            🗓️ Zeroth Review: ${zerothReviewDate ? new Date(zerothReviewDate).toLocaleDateString('en-GB') : 'Not Set'}
            🗓️ First Review: ${firstReviewDate ? new Date(firstReviewDate).toLocaleDateString('en-GB') : 'Will be Announced later'}
            🗓️ Second Review: ${secondReviewDate ? new Date(secondReviewDate).toLocaleDateString('en-GB') : 'Will be Announced later'}
            🗓️ Third Review: ${thirdReviewDate ? new Date(thirdReviewDate).toLocaleDateString('en-GB') : 'Will be Announced later'}
            
            Please plan your reviews accordingly.
            `;

            const templateParams = {
                message: messageBody,
                to_name: `${courseName} Students`,
                to_email: "reviewdeskau@gmail.com", // This can be a dummy email or your service email
                bcc: bccEmails.join(","),
                subject: `📢 Review Deadlines Updated for ${courseName}`
            };

            await emailjs.send(
                'service_zdkw9wb',
                'template_bdoxrlm', // Ensure this template is set up to handle BCC
                templateParams,
                'lBI3Htk5CKshSzMFg'
            );

            toast.success(`Email sent to ${bccEmails.length} students in ${courseName}.`);
        } catch (error) {
            console.error("Error sending email:", error);
            toast.error("Failed to send email to students.");
        }
    };

    return (
        <div className='teacher-dashboard-content'>
        <div className='cont'>
            <div className="dashboard-content">
                <h2 className="text-2xl font-bold mb-4 text-gray-700">Set Review Deadlines</h2>

                {!selectedProgram ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {allPrograms.map((program) => (
                            <button
                                key={program}
                                onClick={() => setSelectedProgram(program)}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                            >
                                {program}
                            </button>
                        ))}
                    </div>
                ) : (
                    <>
                        <h3 className="text-xl font-semibold mb-4 text-gray-600">
                            Deadlines for: <span className="text-purple-700">{selectedProgram}</span>
                        </h3>
                        <form onSubmit={(e) => { e.preventDefault(); handleSetReviewDates(); }}>
                            <div className="form-group mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Zeroth Review Deadline:</label>
                                <input
                                    type="date"
                                    value={zerothReviewDate}
                                    onChange={(e) => setZerothReviewDate(e.target.value)}
                                    required
                                    min={today}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                            </div>

                            <div className="form-group mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">First Review Deadline:</label>
                                <input
                                    type="date"
                                    value={firstReviewDate}
                                    onChange={(e) => setFirstReviewDate(e.target.value)}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                            </div>

                            <div className="form-group mb-6">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Second Review Deadline:</label>
                                <input
                                    type="date"
                                    value={secondReviewDate}
                                    onChange={(e) => setSecondReviewDate(e.target.value)}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                            </div>

                            {/* NEW: Third Review Deadline Input */}
                            <div className="form-group mb-6">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Third Review Deadline:</label>
                                <input
                                    type="date"
                                    value={thirdReviewDate}
                                    onChange={(e) => setThirdReviewDate(e.target.value)}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                            </div>

                            <button
                                type="submit"
                                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? "Updating..." : "Set Deadlines & Notify Students"}
                            </button>
                        </form>

                        <div className="mt-8">
                            <button
                                onClick={() => setSelectedProgram(null)}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
                            >
                                Select Another Program
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
        <Footer />
        </div>
    );
}

export default ReportPage;
