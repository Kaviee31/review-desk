// StudentDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import axios from "axios";
import "../styles/StudentDashboard.css";

function StudentDashboard() {
  useEffect(() => {
    document.title = "Student Dashboard";
  }, []);

  const [studentName, setStudentName] = useState("Guest");
  const [registerNumber, setRegisterNumber] = useState("");
  const [studentCourseName, setStudentCourseName] = useState(""); // New state for student's course name
  const [telegramLinked, setTelegramLinked] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [deadlines, setDeadlines] = useState({
    zerothReviewDeadline: null,
    firstReviewDeadline: null,
    secondReviewDeadline: null,
  });
  // States for file inputs
  const [zerothPdfFile, setZerothPdfFile] = useState(null);
  const [zerothPptFile, setZerothPptFile] = useState(null);
  const [zerothOtherFile, setZerothOtherFile] = useState(null);

  const [firstPdfFile, setFirstPdfFile] = useState(null);
  const [firstPptFile, setFirstPptFile] = useState(null);
  const [firstOtherFile, setFirstOtherFile] = useState(null);

  const [secondPdfFile, setSecondPdfFile] = useState(null);
  const [secondPptFile, setSecondPptFile] = useState(null);
  const [secondOtherFile, setSecondOtherFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const BASE_URL = "http://localhost:5000";

  // States to store uploaded file paths (objects containing pdfPath, pptPath, otherPath, and uploadedAt)
  const [uploadedZerothReview, setUploadedZerothReview] = useState({ pdfPath: null, pptPath: null, otherPath: null, uploadedAt: null });
  const [uploadedFirstReview, setUploadedFirstReview] = useState({ pdfPath: null, pptPath: null, otherPath: null, uploadedAt: null });
  const [uploadedSecondReview, setUploadedSecondReview] = useState({ pdfPath: null, pptPath: null, otherPath: null, uploadedAt: null });

  // Refs for file inputs to clear them
  const zerothPdfInputRef = useRef();
  const zerothPptInputRef = useRef();
  const zerothOtherInputRef = useRef();

  const firstPdfInputRef = useRef();
  const firstPptInputRef = useRef();
  const firstOtherInputRef = useRef();

  const secondPdfInputRef = useRef();
  const secondPptInputRef = useRef();
  const secondOtherInputRef = useRef();


  // Moved fetchReviewDeadlines outside of any useEffect to make it globally accessible within the component
  const fetchReviewDeadlines = async (courseName) => {
    if (!courseName) return; // Don't fetch if courseName is not available

    try {
      const response = await axios.get(`${BASE_URL}/get-review-dates?courseName=${courseName}`);
      setDeadlines({
        zerothReviewDeadline: response.data?.zerothReviewDeadline || null,
        firstReviewDeadline: response.data?.firstReviewDeadline || null,
        secondReviewDeadline: response.data?.secondReviewDeadline || null,
      });
    } catch (error) {
      console.error("Error fetching review deadlines:", error);
    }
  };


  useEffect(() => {
    const fetchUserData = async (user) => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setStudentName(userData?.username ?? user.email);
          setRegisterNumber(userData?.registerNumber ?? "");

          // Fetch student's enrollment to get courseName
          if (userData?.registerNumber) {
            const enrollmentResponse = await axios.get(`${BASE_URL}/student-courses/${userData.registerNumber}`);
            if (enrollmentResponse.data && enrollmentResponse.data.length > 0) {
              // Assuming a student is primarily enrolled in one course for deadline purposes
              // You might need more sophisticated logic if a student can be in multiple courses
              setStudentCourseName(enrollmentResponse.data[0].courseName);
            }
          }

          // Telegram status check
          if (userData?.registerNumber) {
            try {
              const res = await axios.get(`${BASE_URL}/api/telegram-status/${userData.registerNumber}`);
              setTelegramLinked(res.data.linked);
            } catch (error) {
              console.error("Failed to check Telegram status:", error);
              setTelegramLinked(false);
            }
          }

          // Fetch uploaded review files after registerNumber is set
          if (userData?.registerNumber) {
            fetchUploadedReviews(userData.registerNumber);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchAnnouncements = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/all-messages`);
        setAnnouncement(response.data);
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
    };

    // Function to fetch uploaded reviews (now expects object with paths and uploadedAt)
    const fetchUploadedReviews = async (regNo) => {
      try {
        const zerothResponse = await axios.get(`${BASE_URL}/get-latest-review/${regNo}/zeroth`);
        setUploadedZerothReview(zerothResponse.data || { pdfPath: null, pptPath: null, otherPath: null, uploadedAt: null });
      } catch (error) {
        console.warn("No zeroth review found or error fetching:", error.message);
        setUploadedZerothReview({ pdfPath: null, pptPath: null, otherPath: null, uploadedAt: null });
      }

      try {
        const firstResponse = await axios.get(`${BASE_URL}/get-latest-review/${regNo}/first`);
        setUploadedFirstReview(firstResponse.data || { pdfPath: null, pptPath: null, otherPath: null, uploadedAt: null });
      } catch (error) {
        console.warn("No first review found or error fetching:", error.message);
        setUploadedFirstReview({ pdfPath: null, pptPath: null, otherPath: null, uploadedAt: null });
      }

      try {
        const secondResponse = await axios.get(`${BASE_URL}/get-latest-review/${regNo}/second`);
        setUploadedSecondReview(secondResponse.data || { pdfPath: null, pptPath: null, otherPath: null, uploadedAt: null });
      } catch (error) {
        console.warn("No second review found or error fetching:", error.message);
        setUploadedSecondReview({ pdfPath: null, pptPath: null, otherPath: null, uploadedAt: null });
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user);
        fetchAnnouncements();
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate, BASE_URL]); // Add BASE_URL to dependency array

  // New useEffect to call fetchReviewDeadlines once studentCourseName is set
  useEffect(() => {
    if (studentCourseName) {
      fetchReviewDeadlines(studentCourseName);
    }
  }, [studentCourseName, fetchReviewDeadlines]); // Depend on studentCourseName and fetchReviewDeadlines

  // Modified isUploadEnabled to allow uploads up to 7 days after the deadline
  const isUploadEnabled = (deadline) => {
    if (!deadline) return false; // If no deadline is set, disable uploads
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const gracePeriodEnd = new Date(deadlineDate);
    gracePeriodEnd.setDate(deadlineDate.getDate() + 6); // Add 7 days to the deadline

    // Allow upload if current date is before or on the deadline, OR within the 7-day grace period
    return now <= deadlineDate || (now > deadlineDate && now <= gracePeriodEnd);
  };

  // Modified handleFileUpload to accept file, reviewType, fileType, and inputRef
  const handleFileUpload = async (file, reviewType, fileType, inputRef) => {
    if (!file) {
      alert(`Please select a ${fileType.toUpperCase()} file for ${reviewType} review.`);
      return;
    }

    // Basic client-side validation for file types
    if (fileType === "pdf" && file.type !== "application/pdf") {
      alert("Only PDF files are allowed for PDF upload.");
      return;
    }
    if (fileType === "ppt" && !(file.type === "application/vnd.ms-powerpoint" || file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation")) {
      alert("Only PPT/PPTX files are allowed for PPT upload.");
      return;
    }
    // For 'other', allow a broad range but exclude known types for specific inputs
    if (fileType === "other" && (file.type === "application/pdf" || file.type.includes("powerpoint"))) {
      alert("Please use the specific PDF or PPT upload for those file types.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert("File size must be less than 10MB.");
      return;
    }

    const formData = new FormData();
    formData.append(`${reviewType}${fileType.charAt(0).toUpperCase() + fileType.slice(1)}`, file); // e.g., zerothPdf, firstPpt
    formData.append("registerNumber", registerNumber);
    formData.append("reviewType", reviewType); // Still send reviewType to identify the main review entry

    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/upload-review`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      alert(response.data.message || `Successfully uploaded ${fileType.toUpperCase()} for ${reviewType} review.`);

      // Update the correct state based on reviewType and fileType
      const newFilePaths = response.data.filePath;
      if (reviewType === "zeroth") {
        setUploadedZerothReview(prev => ({ ...prev, ...newFilePaths }));
      } else if (reviewType === "first") {
        setUploadedFirstReview(prev => ({ ...prev, ...newFilePaths }));
      } else if (reviewType === "second") {
        setUploadedSecondReview(prev => ({ ...prev, ...newFilePaths }));
      }

      // Clear input after successful upload
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      // Reset specific file state
      if (reviewType === "zeroth") {
        if (fileType === "pdf") setZerothPdfFile(null);
        if (fileType === "ppt") setZerothPptFile(null);
        if (fileType === "other") setZerothOtherFile(null);
      } else if (reviewType === "first") {
        if (fileType === "pdf") setFirstPdfFile(null);
        if (fileType === "ppt") setFirstPptFile(null);
        if (fileType === "other") setFirstOtherFile(null);
      } else if (reviewType === "second") {
        if (fileType === "pdf") setSecondPdfFile(null);
        if (fileType === "ppt") setSecondPptFile(null);
        if (fileType === "other") setSecondOtherFile(null);
      }

    } catch (error) {
      alert(error.response?.data?.error || `Error uploading ${fileType.toUpperCase()} for ${reviewType} review.`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to render file input and upload button
  const renderFileUploadControls = (reviewType, fileType, fileState, setFileState, uploadedFilePaths, inputRef, deadline) => {
    const isFileUploaded = uploadedFilePaths[`${fileType}Path`];
    const isEnabled = isUploadEnabled(deadline); // Use the updated isUploadEnabled logic

    return (
      <div className="file-upload-control">
        <label className="file-label">{fileType.toUpperCase()}:</label>
        {isFileUploaded ? (
          <a
            href={`${BASE_URL}/${isFileUploaded}`}
            target="_blank"
            rel="noopener noreferrer"
            className="uploaded-file-link"
          >
            View Uploaded {fileType.toUpperCase()}
          </a>
        ) : (
          <input
            type="file"
            title={`Upload ${fileType.toUpperCase()} for ${reviewType} Review`}
            accept={fileType === "pdf" ? "application/pdf" : fileType === "ppt" ? ".ppt,.pptx" : "*/*"}
            ref={inputRef}
            onChange={(e) => setFileState(e.target.files[0])}
            disabled={!isEnabled}
          />
        )}
        <button
          onClick={() => handleFileUpload(fileState, reviewType, fileType, inputRef)}
          disabled={!isEnabled || loading || (!fileState && isFileUploaded)} // Disable if no new file for re-upload
          className={`upload-button ${!isEnabled || loading || (!fileState && isFileUploaded) ? 'disabled' : ''}`}
        >
          {isFileUploaded && fileState ? "Re-upload" : "Upload"}
        </button>
      </div>
    );
  };


  return (
    <>
      <div className="contain">
        <div className="box">
          <div className="profile-card">
            <h2>{studentName}</h2>
            <p>Register Number: {registerNumber}</p>
            {studentCourseName && <p>Course: {studentCourseName}</p>} {/* Display student's course */}

            {telegramLinked === null ? (
              <p>Checking Telegram status...</p>
            ) : telegramLinked ? (
              <p>✅ Telegram Linked</p>
            ) : (
              <p>
                ❌ Telegram Not Linked.{" "}
                <a
                  href="https://t.me/NewAnnouncementbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#007bff", textDecoration: "underline" }}
                >
                  Connect Now
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="box">
          <div className={`announcement-section ${announcement?.length ? "show" : ""}`}>
            {announcement && announcement.length > 0 && (
              <>
                <h3>📢 Announcements</h3>
                {announcement.map((item, index) => (
                  <p key={index} className="announcement-item">
                    {item.content}
                  </p>
                ))}
              </>
            )}
          </div>

          <div className="review-upload-section">
            <h3>📂 Upload Review Documents</h3>
            <div className="table-responsive-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Review Type</th>
                    <th>PDF</th>
                    <th>PPT</th>
                    <th>Other Document</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Zeroth Review</td>
                    <td>
                      {renderFileUploadControls("zeroth", "pdf", zerothPdfFile, setZerothPdfFile, uploadedZerothReview, zerothPdfInputRef, deadlines.zerothReviewDeadline)}
                    </td>
                    <td>
                      {renderFileUploadControls("zeroth", "ppt", zerothPptFile, setZerothPptFile, uploadedZerothReview, zerothPptInputRef, deadlines.zerothReviewDeadline)}
                    </td>
                    <td>
                      {renderFileUploadControls("zeroth", "other", zerothOtherFile, setZerothOtherFile, uploadedZerothReview, zerothOtherInputRef, deadlines.zerothReviewDeadline)}
                    </td>
                    <td>{deadlines.zerothReviewDeadline ? new Date(deadlines.zerothReviewDeadline).toLocaleDateString() : "Not Set"}</td>
                  </tr>

                  <tr>
                    <td>First Review</td>
                    <td>
                      {renderFileUploadControls("first", "pdf", firstPdfFile, setFirstPdfFile, uploadedFirstReview, firstPdfInputRef, deadlines.firstReviewDeadline)}
                    </td>
                    <td>
                      {renderFileUploadControls("first", "ppt", firstPptFile, setFirstPptFile, uploadedFirstReview, firstPptInputRef, deadlines.firstReviewDeadline)}
                    </td>
                    <td>
                      {renderFileUploadControls("first", "other", firstOtherFile, setFirstOtherFile, uploadedFirstReview, firstOtherInputRef, deadlines.firstReviewDeadline)}
                    </td>
                    <td>{deadlines.firstReviewDeadline ? new Date(deadlines.firstReviewDeadline).toLocaleDateString() : "Not Set"}</td>
                  </tr>

                  <tr>
                    <td>Second Review</td>
                    <td>
                      {renderFileUploadControls("second", "pdf", secondPdfFile, setSecondPdfFile, uploadedSecondReview, secondPdfInputRef, deadlines.secondReviewDeadline)}
                    </td>
                    <td>
                      {renderFileUploadControls("second", "ppt", secondPptFile, setSecondPptFile, uploadedSecondReview, secondPptInputRef, deadlines.secondReviewDeadline)}
                    </td>
                    <td>
                      {renderFileUploadControls("second", "other", secondOtherFile, setSecondOtherFile, uploadedSecondReview, secondOtherInputRef, deadlines.secondReviewDeadline)}
                    </td>
                    <td>{deadlines.secondReviewDeadline ? new Date(deadlines.secondReviewDeadline).toLocaleDateString() : "Not Set"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Outlet />
    </>
  );
}

export default StudentDashboard;
