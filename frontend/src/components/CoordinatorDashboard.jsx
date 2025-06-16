import React, { useState, useEffect, useCallback } from "react";
import { auth, db } from "../firebase"; // Import auth and db from your firebase.js
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from 'react-toastify'; // For notifications
import 'react-toastify/dist/ReactToastify.css';
import "../styles/CoordinatorDashboard.css"; // Assuming this CSS provides styling

function CoordinatorDashboard() {
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [assignedCourse, setAssignedCourse] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [extraRowsCount, setExtraRowsCount] = useState(0);
  const [extraRowsData, setExtraRowsData] = useState([]);
  const [totals, setTotals] = useState({
    r1_total: 0,
    r2_total: 0,
    r3_total: 0,
  });
  const [coordinatorUid, setCoordinatorUid] = useState(null); // Store the current coordinator's UID
  const [loadingReviews, setLoadingReviews] = useState(false); // New loading state for reviews
  const [savingReviews, setSavingReviews] = useState(false); // New saving state for reviews

  const allPrograms = ["MCA(R)", "MCA(SS)", "MTECH(R)", "MTECH(SS)"];

  // Base URL for your backend API
  const API_BASE_URL = "http://localhost:5000"; // Ensure this matches your backend server URL
useEffect(() => {
    document.title = "Coordinator Dashboard";
  }, []);
  // Effect to fetch coordinator's assigned course on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCoordinatorUid(user.uid); // Set the UID
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.profession === "Coordinator" && userData.department) {
              setAssignedCourse(userData.department);
            } else {
              console.warn("User is not a coordinator or has no assigned department.");
            }
          } else {
            console.warn("No user document found for UID:", user.uid);
          }
        } catch (error) {
          console.error("Error fetching coordinator data:", error);
          toast.error("Failed to load coordinator data.");
        }
      } else {
        setAssignedCourse(null);
        setCoordinatorUid(null); // Clear UID if user signs out
      }
      setLoadingUserData(false);
    });

    return () => unsubscribe();
  }, []);


  // Function to save review data to the backend
  const saveReviewData = useCallback(async (showSuccessToast = false) => {
    if (!coordinatorUid || !selectedProgram) {
      console.log("Cannot save: Coordinator UID or selected program is missing.");
      return;
    }
    setSavingReviews(true); // Indicate saving process
    try {
      const response = await fetch(`http://localhost:5000/coordinator-reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinatorId: coordinatorUid,
          program: selectedProgram,
          reviewData: extraRowsData,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save review data.");
      }
      if (showSuccessToast) {
        toast.success("Review data submitted successfully!");
      } else {
        toast.success("Review data saved automatically."); // Indicate auto-save
      }
    } catch (error) {
      console.error("Error saving review data:", error);
      toast.error(`Failed to save review data: ${error.message}`);
    } finally {
      setSavingReviews(false); // End saving process
    }
  }, [coordinatorUid, selectedProgram, extraRowsData, API_BASE_URL]);

  // Effect to load review data when a program is selected and coordinator UID is available
  useEffect(() => {
    const loadReviewData = async () => {
      if (selectedProgram && coordinatorUid) {
        setLoadingReviews(true); // Indicate loading reviews
        try {
          const response = await fetch(`${API_BASE_URL}/coordinator-reviews/${coordinatorUid}/${selectedProgram}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to load review data.");
          }
          const data = await response.json();
          // Ensure data.reviewData is an array, default to empty if not found or null
          const loadedData = Array.isArray(data.reviewData) ? data.reviewData : [];
          setExtraRowsData(loadedData);
          setExtraRowsCount(loadedData.length); // Set count based on loaded data
          toast.info("Review data loaded.");
        } catch (error) {
          console.error("Error loading review data:", error);
          toast.error(`Failed to load previous review data: ${error.message}`);
          setExtraRowsData([]); // Clear data on error
          setExtraRowsCount(0);
        } finally {
          setLoadingReviews(false); // End loading reviews
        }
      }
    };

    loadReviewData();
  }, [selectedProgram, coordinatorUid, API_BASE_URL]); // Depend on selectedProgram and coordinatorUid

  // Effect to auto-save data whenever extraRowsData changes (debounced)
  useEffect(() => {
    if (selectedProgram && coordinatorUid && !loadingReviews) { // Only save if a program is selected and not currently loading reviews
      const handler = setTimeout(() => {
        saveReviewData(false); // Call save without showing success toast for auto-save
      }, 1500); // Save after 1.5 seconds of inactivity

      return () => {
        clearTimeout(handler); // Clear timeout if data changes again before the delay
      };
    }
  }, [extraRowsData, selectedProgram, coordinatorUid, loadingReviews, saveReviewData]);


  // Initialize extraRowsData when extraRowsCount changes
  useEffect(() => {
    setExtraRowsData((oldData) => {
      const newData = [];
      for (let i = 0; i < extraRowsCount; i++) {
        newData[i] = oldData[i] || {
          r1_desc: "",
          r1_mark: "",
          r2_desc: "",
          r2_mark: "",
          r3_desc: "",
          r3_mark: "",
        };
      }
      return newData;
    });
  }, [extraRowsCount]);

  // Handler for changes in extra row input fields
  const handleExtraChange = (index, field, value) => {
    setExtraRowsData((prev) => {
      const updatedRow = { ...prev[index], [field]: value };
      const newData = [...prev];
      newData[index] = updatedRow;
      return newData;
    });
  };

  // Effect to calculate totals when extraRowsData changes
  useEffect(() => {
    let r1_total = 0,
      r2_total = 0,
      r3_total = 0;
    extraRowsData.forEach((row) => {
      const r1_mark = parseFloat(row.r1_mark);
      const r2_mark = parseFloat(row.r2_mark);
      const r3_mark = parseFloat(row.r3_mark);
      r1_total += isNaN(r1_mark) ? 0 : r1_mark;
      r2_total += isNaN(r2_mark) ? 0 : r2_mark;
      r3_total += isNaN(r3_mark) ? 0 : r3_mark;
    });
    setTotals({
      r1_total: r1_total.toFixed(2),
      r2_total: r2_total.toFixed(2),
      r3_total: r3_total.toFixed(2),
    });
  }, [extraRowsData]);

  // Handler for changing the number of extra review items
  const handleExtraRowsCountChange = (e) => {
    const val = e.target.value;
    const numVal = Number(val);
    if (!isNaN(numVal) && numVal >= 0) {
      setExtraRowsCount(numVal);
    }
  };

  // Renders the dynamic extra rows for the table
  const renderExtraRows = () =>
    extraRowsData.map((row, index) => (
      <tr key={index} className="hover-row">
        <td className="narrow-col">{index + 1}</td>

        <td className="description-col">
          <input
            type="text"
            className="table-cell-input"
            placeholder="Review 1 description"
            spellCheck="false"
            autoComplete="off"
            value={row.r1_desc}
            onChange={(e) => handleExtraChange(index, "r1_desc", e.target.value)}
          />
        </td>
        <td className="marks-col">
          <input
            type="number"
            min="0"
            className="marks-input"
            placeholder="0"
            value={row.r1_mark}
            onChange={(e) => handleExtraChange(index, "r1_mark", e.target.value)}
          />
        </td>

        <td className="narrow-col" aria-hidden="true"></td>
        <td className="description-col">
          <input
            type="text"
            className="table-cell-input"
            placeholder="Review 2 description"
            spellCheck="false"
            autoComplete="off"
            value={row.r2_desc}
            onChange={(e) => handleExtraChange(index, "r2_desc", e.target.value)}
          />
        </td>
        <td className="marks-col">
          <input
            type="number"
            min="0"
            className="marks-input"
            placeholder="0"
            value={row.r2_mark}
            onChange={(e) => handleExtraChange(index, "r2_mark", e.target.value)}
          />
        </td>

        <td className="narrow-col" aria-hidden="true"></td>
        <td className="description-col">
          <input
            type="text"
            className="table-cell-input"
            placeholder="Review 3 description"
            spellCheck="false"
            autoComplete="off"
            value={row.r3_desc}
            onChange={(e) => handleExtraChange(index, "r3_desc", e.target.value)}
          />
        </td>
        <td className="marks-col">
          <input
            type="number"
            min="0"
            className="marks-input"
            placeholder="0"
            value={row.r3_mark}
            onChange={(e) => handleExtraChange(index, "r3_mark", e.target.value)}
          />
        </td>
      </tr>
    ));

  // Show a loading indicator while user data is being fetched
  if (loadingUserData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-700">Loading coordinator data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 bg-gray-100 font-inter">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Coordinator Dashboard
      </h1>

      {/* Buttons for program selection */}
      {!selectedProgram && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 w-full max-w-4xl">
          {allPrograms.map((program) => (
            <button
              key={program}
              onClick={() => setSelectedProgram(program)}
              // Disable button if it's not the assigned course for the coordinator
              disabled={assignedCourse && program !== assignedCourse}
              className={`font-semibold py-4 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75
                ${program === "MCA(R)" ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500" :
                  program === "MCA(SS)" ? "bg-green-600 hover:bg-green-700 focus:ring-green-500" :
                    program === "MTECH(R)" ? "bg-purple-600 hover:bg-purple-700 focus:ring-purple-500" :
                      "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                }
                ${assignedCourse && program !== assignedCourse ? "opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400" : "text-white"}
              `}
            >
              {program}
            </button>
          ))}
        </div>
      )}

      {/* Conditional rendering of the review mark entry UI */}
      {selectedProgram && (
        <div className="coordinator-dashboard w-full max-w-6xl bg-white p-6 rounded-lg shadow-xl" role="main">
          <h2 className="text-2xl font-bold mb-4 text-gray-700">
            Coordinator Review Mark Entry for {selectedProgram}
          </h2>
          <p className="text-gray-600 mb-6">
            Enter the number of additional review items and fill out their marks.
          </p>

          <div className="extra-rows-input-section mb-6 flex items-center justify-center">
            <label htmlFor="extraRows" className="text-lg font-medium text-gray-700 mr-3">
              Add extra review items:
            </label>
            <input
              type="number"
              id="extraRows"
              value={extraRowsCount}
              onChange={handleExtraRowsCountChange}
              min="0"
              className="num-rows-input w-24 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
              aria-label="Number of extra review items"
              step="1"
              inputMode="numeric"
            />
          </div>

          {loadingReviews ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-xl text-gray-700">Loading reviews...</p>
            </div>
          ) : (
            <div className="dynamic-table-container overflow-x-auto" role="region" aria-labelledby="tableLabel">
              <table aria-describedby="tableDesc" aria-label="Review marks entry table" className="min-w-full bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                <thead className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal">
                  <tr>
                    <th colSpan="3" className="review-header py-3 px-6 text-center border-b-2 border-gray-300">
                      Review 1
                    </th>
                    <th colSpan="3" className="review-header py-3 px-6 text-center border-b-2 border-gray-300">
                      Review 2
                    </th>
                    <th colSpan="3" className="review-header py-3 px-6 text-center border-b-2 border-gray-300">
                      Review 3
                    </th>
                  </tr>
                  <tr>
                    <th className="narrow-col py-3 px-6 text-center border-b border-gray-300" aria-label="Item Number">
                      #
                    </th>
                    <th className="description-col py-3 px-6 text-left border-b border-gray-300">Description</th>
                    <th className="marks-col py-3 px-6 text-center border-b border-gray-300">Marks</th>

                    <th className="narrow-col py-3 px-6 text-center border-b border-gray-300" aria-hidden="true"></th>
                    <th className="description-col py-3 px-6 text-left border-b border-gray-300">Description</th>
                    <th className="marks-col py-3 px-6 text-center border-b border-gray-300">Marks</th>

                    <th className="narrow-col py-3 px-6 text-center border-b border-gray-300" aria-hidden="true"></th>
                    <th className="description-col py-3 px-6 text-left border-b border-gray-300">Description</th>
                    <th className="marks-col py-3 px-6 text-center border-b border-gray-300">Marks</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 text-sm font-light">
                  {renderExtraRows()}

                  <tr className="total-row bg-gray-50 hover:bg-gray-100 font-bold text-base">
                    <td colSpan="2" className="total-cell py-3 px-6 text-right border-t border-gray-300">
                      Total
                    </td>
                    <td className="py-3 px-6 text-center border-t border-gray-300">
                      <input
                        type="text"
                        readOnly
                        value={totals.r1_total}
                        className="marks-input bold-text w-full p-2 bg-transparent border-none text-center focus:outline-none"
                        aria-label="Total marks for review 1"
                      />
                    </td>

                    <td colSpan="2" className="total-cell py-3 px-6 text-right border-t border-gray-300">
                      Total
                    </td>
                    <td className="py-3 px-6 text-center border-t border-gray-300">
                      <input
                        type="text"
                        readOnly
                        value={totals.r2_total}
                        className="marks-input bold-text w-full p-2 bg-transparent border-none text-center focus:outline-none"
                        aria-label="Total marks for review 2"
                      />
                    </td>

                    <td colSpan="2" className="total-cell py-3 px-6 text-right border-t border-gray-300">
                      Total
                    </td>
                    <td className="py-3 px-6 text-center border-t border-gray-300">
                      <input
                        type="text"
                        readOnly
                        value={totals.r3_total}
                        className="marks-input bold-text w-full p-2 bg-transparent border-none text-center focus:outline-none"
                        aria-label="Total marks for review 3"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {savingReviews && (
            <div className="flex justify-center mt-4">
              <p className="text-blue-600">Saving changes...</p>
            </div>
          )}

          {/* Submit and Back buttons */}
          <div className="flex justify-center mt-6 space-x-4">
            <button
              onClick={() => saveReviewData(true)} // Pass true to show success toast for explicit submit
              disabled={savingReviews || loadingReviews} // Disable during saving or loading
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingReviews ? "Submitting..." : "Submit Changes"}
            </button>

            <button
              onClick={() => {
                setSelectedProgram(null);
                setExtraRowsCount(0); // Reset count when changing program
                setExtraRowsData([]); // Clear data when changing program
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
            >
              Select Another Program
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoordinatorDashboard;
