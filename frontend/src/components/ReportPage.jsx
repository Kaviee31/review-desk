import React, { useState, useEffect, useCallback } from 'react'; // MODIFIED: Added useCallback
import axios from 'axios';
import emailjs from '@emailjs/browser';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Footer from './Footer';
import '../styles/ReportPage.css';
export const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL

function ReportPage() {
    useEffect(() => {
        document.title = "Manage Deadlines & Locks"; // MODIFIED: Title updated
    }, []);

    const [selectedProgram, setSelectedProgram] = useState(null);
    const [zerothReviewDate, setZerothReviewDate] = useState('');
    const [firstReviewDate, setFirstReviewDate] = useState('');
    const [secondReviewDate, setSecondReviewDate] = useState('');
    const [thirdReviewDate, setThirdReviewDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [lockStatus, setLockStatus] = useState('Unlocked'); // NEW: State to hold the marks lock status
    const [unlocking, setUnlocking] = useState(false); // NEW: State for unlock button loading
    const today = new Date().toISOString().split('T')[0];
    
    const allPrograms = [
        "MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(AI_DS)",
        "B.TECH(IT) BATCH1", "B.TECH(IT) BATCH2"
    ];

    // NEW: Function to fetch the lock status for the selected program
    const fetchLockStatus = useCallback(async (program) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/marks-lock/status/${program}`);
            setLockStatus(response.data.status);
        } catch (error) {
            console.error("Error fetching lock status:", error);
            toast.error("Failed to load marks lock status.");
        }
    }, []);

    // MODIFIED: useEffect to fetch both review dates and lock status
    useEffect(() => {
        const fetchProgramData = async () => {
            if (selectedProgram) {
                // Fetch review dates
                try {
                    const response = await axios.get(`${API_BASE_URL}/get-review-dates?courseName=${selectedProgram}`);
                    if (response.data) {
                        setZerothReviewDate(response.data.zerothReviewDeadline ? new Date(response.data.zerothReviewDeadline).toISOString().split('T')[0] : '');
                        setFirstReviewDate(response.data.firstReviewDeadline ? new Date(response.data.firstReviewDeadline).toISOString().split('T')[0] : '');
                        setSecondReviewDate(response.data.secondReviewDeadline ? new Date(response.data.secondReviewDeadline).toISOString().split('T')[0] : '');
                        setThirdReviewDate(response.data.thirdReviewDeadline ? new Date(response.data.thirdReviewDeadline).toISOString().split('T')[0] : '');
                    } else {
                        setZerothReviewDate('');
                        setFirstReviewDate('');
                        setSecondReviewDate('');
                        setThirdReviewDate('');
                    }
                } catch (error) {
                    console.error("Error fetching review dates:", error);
                    toast.error("Failed to load review dates.");
                }

                // Fetch lock status
                await fetchLockStatus(selectedProgram);
            }
        };
        fetchProgramData();
    }, [selectedProgram, fetchLockStatus]); // Re-run when selectedProgram or fetchLockStatus changes

    // ... (handleSetReviewDates and sendEmailToStudentsByCourse functions remain the same)
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
        if (thirdReviewDate && secondReviewDate && new Date(thirdReviewDate) <= new Date(secondReviewDate)) {
            toast.warning("Third Review must be after Second Review.");
            return;
        }

        setLoading(true);

        try {
            await axios.post(`${API_BASE_URL}/set-review-dates`, {
                courseName: selectedProgram,
                zerothReviewDeadline: zerothReviewDate,
                firstReviewDeadline: firstReviewDate,
                secondReviewDeadline: secondReviewDate,
                thirdReviewDeadline: thirdReviewDate,
            });

            toast.success(`Review deadlines for ${selectedProgram} updated successfully!`);
            await sendEmailToStudentsByCourse(selectedProgram);
        } catch (error) {
            console.error("Error updating deadlines:", error);
            toast.error("Failed to set review deadlines.");
        } finally {
            setLoading(false);
        }
    };

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
                to_email: "reviewdeskau@gmail.com",
                bcc: bccEmails.join(","),
                subject: `📢 Review Deadlines Updated for ${courseName}`
            };

            await emailjs.send(
                'service_zdkw9wb',
                'template_bdoxrlm',
                templateParams,
                'lBI3Htk5CKshSzMFg'
            );

            toast.success(`Email sent to ${bccEmails.length} students in ${courseName}.`);
        } catch (error) {
            console.error("Error sending email:", error);
            toast.error("Failed to send email to students.");
        }
    };

    // NEW: Function to handle unlocking marks
    const handleUnlockMarks = async () => {
        if (!selectedProgram) {
            toast.error("No program selected.");
            return;
        }

        if (window.confirm(`Are you sure you want to unlock marks for ${selectedProgram}? This will allow guides to edit marks again.`)) {
            setUnlocking(true);
            try {
                await axios.post(`${API_BASE_URL}/marks-lock/unlock`, {
                    courseName: selectedProgram,
                });
                toast.success(`Marks for ${selectedProgram} have been unlocked!`);
                await fetchLockStatus(selectedProgram); // Refresh the status
            } catch (error) {
                console.error("Error unlocking marks:", error);
                toast.error("Failed to unlock marks.");
            } finally {
                setUnlocking(false);
            }
        }
    };

    return (
        <div className='teacher-dashboard-content'>
        <div className='cont'>
            <div className="dashboard-content">
                <h2 className="text-2xl font-bold mb-4 text-gray-700">Manage Review Deadlines</h2>

                {!selectedProgram ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {allPrograms.map((program) => (
                            <button
                                key={program}
                                onClick={() => setSelectedProgram(program)}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                            >
                                {program}
                            </button>
                        ))}
                    </div>
                ) : (
                    <>
                        <h3 className="text-xl font-semibold mb-4 text-gray-600">
                             <span className="text-purple-700">{selectedProgram}</span>
                        </h3>
                        
                        {/* Section for Deadlines */}
                        <div className="p-6 border rounded-lg shadow-md bg-white">
                            <h4 className="text-lg font-bold mb-4 text-gray-800">Review Deadlines</h4>
                            <form onSubmit={(e) => { e.preventDefault(); handleSetReviewDates(); }}>
                                {/* ... (date input fields remain the same) ... */}
                                <div className="form-group mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Zeroth Review Deadline:</label>
                                    <input type="date" value={zerothReviewDate} onChange={(e) => setZerothReviewDate(e.target.value)} required min={today} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                                </div>
                                <div className="form-group mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">First Review Deadline:</label>
                                    <input type="date" value={firstReviewDate} onChange={(e) => setFirstReviewDate(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                                </div>
                                <div className="form-group mb-6">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Second Review Deadline:</label>
                                    <input type="date" value={secondReviewDate} onChange={(e) => setSecondReviewDate(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                                </div>
                                <div className="form-group mb-6">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Third Review Deadline:</label>
                                    <input type="date" value={thirdReviewDate} onChange={(e) => setThirdReviewDate(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                                </div>
                                <button type="submit" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" disabled={loading}>
                                    {loading ? "Updating..." : "Set Deadlines & Notify"}
                                </button>
                            </form>
                        </div>
                        
                        {/* NEW: Section for Marks Lock Management */}
                        <div className="p-6 border rounded-lg shadow-md bg-white mt-8 text-black">
    <h4 className="text-lg font-bold mb-4">Marks Lock Management</h4>
    <div className="flex items-center space-x-4">
        <p className="font-medium">Current Status:</p>
        {lockStatus === 'Locked' ? (
            <span className="font-bold text-lg">🔒 Locked</span>
        ) : (
            <span className="font-bold text-lg">✅ Unlocked</span>
        )}
    </div>
    {lockStatus === 'Locked' && (
        <div className="mt-4">
            <p className="text-sm mb-2">Guides cannot edit marks for this course. Click below to re-enable editing.</p>
            <button
                onClick={handleUnlockMarks}
                disabled={unlocking}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 ease-in-out disabled:opacity-50"
            >
                {unlocking ? "Unlocking..." : "Unlock Marks Now"}
            </button>
        </div>
    )}
</div>
                        <div className="mt-8">
                            <button
                                onClick={() => setSelectedProgram(null)}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
                            >
                                ← Select Another Program
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