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
  const [telegramLinked, setTelegramLinked] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [deadlines, setDeadlines] = useState({
    zerothReviewDeadline: null,
    firstReviewDeadline: null,
    secondReviewDeadline: null,
  });
  const [zerothReviewFile, setZerothReviewFile] = useState(null);
  const [firstReviewFile, setFirstReviewFile] = useState(null);
  const [secondReviewFile, setSecondReviewFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
const BASE_URL= "http://localhost:5000";
  const zerothInputRef = useRef();
  const firstInputRef = useRef();
  const secondInputRef = useRef();

  useEffect(() => {
    const fetchUserData = async (user) => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setStudentName(userData?.username ?? user.email);
          setRegisterNumber(userData?.registerNumber ?? "");

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

    const fetchReviewDeadlines = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/get-review-dates`);
        setDeadlines({
          zerothReviewDeadline: response.data?.zerothReviewDeadline || null,
          firstReviewDeadline: response.data?.firstReviewDeadline || null,
          secondReviewDeadline: response.data?.secondReviewDeadline || null,
        });
      } catch (error) {
        console.error("Error fetching review deadlines:", error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user);
        fetchAnnouncements();
        fetchReviewDeadlines();
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const isUploadEnabled = (deadline) => {
    return deadline && !isNaN(new Date(deadline)) && new Date() <= new Date(deadline);
  };

  const handleFileUpload = async (file, reviewType, inputRef) => {
    if (!file) {
      alert(`Please select a file for ${reviewType} review.`);
      return;
    }
    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert("File size must be less than 8MB.");
      return;
    }

    const formData = new FormData();
    formData.append("reviewFile", file);
    formData.append("registerNumber", registerNumber);
    formData.append("reviewType", reviewType);

    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/upload-review`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      alert(response.data.message || `Successfully uploaded ${reviewType} review.`);

      // Clear input after successful upload
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      if (reviewType === "zeroth") setZerothReviewFile(null);
      if (reviewType === "first") setFirstReviewFile(null);
      if (reviewType === "second") setSecondReviewFile(null);
    } catch (error) {
      alert(error.response?.data?.error || `Error uploading ${reviewType} review.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="contain">
        <div className="box">
          <div className="profile-card">
            <h2>{studentName}</h2>
            <p>Register Number: {registerNumber}</p>

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
                    <th>Upload File</th>
                    <th>Action</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Zeroth Review</td>
                    <td>
                      <input
                        type="file"
                        title="Upload PDF for Zeroth Review"
                        accept="application/pdf"
                        ref={zerothInputRef}
                        onChange={(e) => setZerothReviewFile(e.target.files[0])}
                        disabled={!isUploadEnabled(deadlines.zerothReviewDeadline)}
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => handleFileUpload(zerothReviewFile, "zeroth", zerothInputRef)}
                        disabled={!isUploadEnabled(deadlines.zerothReviewDeadline) || loading}
                      >
                        Upload
                      </button>
                    </td>
                    <td>{deadlines.zerothReviewDeadline ? new Date(deadlines.zerothReviewDeadline).toLocaleDateString() : "Not Set"}</td>
                  </tr>

                  <tr>
                    <td>First Review</td>
                    <td>
                      <input
                        type="file"
                        title="Upload PDF for First Review"
                        accept="application/pdf"
                        ref={firstInputRef}
                        onChange={(e) => setFirstReviewFile(e.target.files[0])}
                        disabled={!isUploadEnabled(deadlines.firstReviewDeadline)}
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => handleFileUpload(firstReviewFile, "first", firstInputRef)}
                        disabled={!isUploadEnabled(deadlines.firstReviewDeadline) || loading}
                      >
                        Upload
                      </button>
                    </td>
                    <td>{deadlines.firstReviewDeadline ? new Date(deadlines.firstReviewDeadline).toLocaleDateString() : "Not Set"}</td>
                  </tr>

                  <tr>
                    <td>Second Review</td>
                    <td>
                      <input
                        type="file"
                        title="Upload PDF for Second Review"
                        accept="application/pdf"
                        ref={secondInputRef}
                        onChange={(e) => setSecondReviewFile(e.target.files[0])}
                        disabled={!isUploadEnabled(deadlines.secondReviewDeadline)}
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => handleFileUpload(secondReviewFile, "second", secondInputRef)}
                        disabled={!isUploadEnabled(deadlines.secondReviewDeadline) || loading}
                      >
                        Upload
                      </button>
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
