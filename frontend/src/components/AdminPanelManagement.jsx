import React, { useState, useEffect } from "react";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import { courses } from "../constants/courses";
import { API_BASE_URL } from "./TeacherDashboard";

function AdminPanelManagement() {
  const [panels, setPanels] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingPanel, setCreatingPanel] = useState(false);

  const auth = getAuth();

  // Fetch all panels
  const fetchPanels = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/panels`);
      setPanels(res.data);
    } catch {
      toast.error("Failed to load panels.");
    }
  };

  // Fetch all teachers from Firestore
  const fetchTeachers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const teacherList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const roles = data.roles || [];
        const isTeacher =
          Array.isArray(roles)
            ? roles.includes("Teacher")
            : data.profession === "Teacher";
        if (isTeacher) {
          teacherList.push({
            uid: doc.id,
            name: data.name || data.displayName || data.email,
            email: data.email,
          });
        }
      });
      setTeachers(teacherList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Failed to load teachers:", err);
      toast.error("Failed to load teacher list.");
    }
  };

  useEffect(() => {
    fetchPanels();
    fetchTeachers();
  }, []);

  // Courses that already have a panel
  const takenCourses = panels.map((p) => p.courseName);
  const availableCourses = courses.filter((c) => !takenCourses.includes(c));

  // Create new panel
  const handleCreatePanel = async () => {
    if (!selectedCourse) return toast.error("Select a course first.");
    setCreatingPanel(true);
    try {
      const adminUid = auth.currentUser?.uid || "admin";
      await axios.post(`${API_BASE_URL}/api/panels`, {
        courseName: selectedCourse,
        createdBy: adminUid,
      });
      toast.success(`Panel created for ${selectedCourse}`);
      setSelectedCourse("");
      fetchPanels();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create panel.");
    } finally {
      setCreatingPanel(false);
    }
  };

  // Delete a panel
  const handleDeletePanel = async (panelId, courseName) => {
    if (!window.confirm(`Delete panel for ${courseName}? All marks will be lost.`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/panels/${panelId}`);
      toast.success("Panel deleted.");
      if (selectedPanel?._id === panelId) setSelectedPanel(null);
      fetchPanels();
    } catch {
      toast.error("Failed to delete panel.");
    }
  };

  // Add teacher to selected panel
  const handleAddTeacher = async () => {
    if (!selectedTeacher) return toast.error("Select a teacher first.");
    const teacher = teachers.find((t) => t.email === selectedTeacher);
    if (!teacher) return;
    setLoading(true);
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/panels/${selectedPanel._id}/teachers`,
        { action: "add", teacher: { email: teacher.email, name: teacher.name } }
      );
      setSelectedPanel(res.data);
      setSelectedTeacher("");
      fetchPanels();
      toast.success(`${teacher.name} added to panel.`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add teacher.");
    } finally {
      setLoading(false);
    }
  };

  // Remove teacher from panel
  const handleRemoveTeacher = async (teacherEmail, teacherName) => {
    setLoading(true);
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/panels/${selectedPanel._id}/teachers`,
        { action: "remove", teacher: { email: teacherEmail } }
      );
      setSelectedPanel(res.data);
      fetchPanels();
      toast.success(`${teacherName} removed from panel.`);
    } catch {
      toast.error("Failed to remove teacher.");
    } finally {
      setLoading(false);
    }
  };

  // Teachers not yet in the selected panel
  const availableTeachers = selectedPanel
    ? teachers.filter(
        (t) => !selectedPanel.teachers.some((pt) => pt.email === t.email)
      )
    : teachers;

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "1.5rem", fontWeight: "700" }}>
        Panel Management
      </h2>

      {/* Create Panel */}
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "28px",
        }}
      >
        <h3 style={{ marginBottom: "14px", fontWeight: "600" }}>Create New Panel</h3>
        {availableCourses.length === 0 ? (
          <p style={{ color: "#6b7280" }}>All courses already have a panel.</p>
        ) : (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                minWidth: "200px",
                fontSize: "0.95rem",
              }}
            >
              <option value="">Select a course</option>
              {availableCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreatePanel}
              disabled={creatingPanel || !selectedCourse}
              style={{
                padding: "8px 20px",
                background: creatingPanel || !selectedCourse ? "#9ca3af" : "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: creatingPanel || !selectedCourse ? "not-allowed" : "pointer",
                fontWeight: "600",
              }}
            >
              {creatingPanel ? "Creating..." : "Create Panel"}
            </button>
          </div>
        )}
      </div>

      {/* Panels List + Detail */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px" }}>
        {/* Left: panels list */}
        <div>
          <h3 style={{ fontWeight: "600", marginBottom: "12px" }}>
            All Panels ({panels.length})
          </h3>
          {panels.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>No panels created yet.</p>
          ) : (
            panels.map((panel) => (
              <div
                key={panel._id}
                onClick={() => setSelectedPanel(panel)}
                style={{
                  padding: "12px 16px",
                  marginBottom: "8px",
                  borderRadius: "8px",
                  border: `1px solid ${selectedPanel?._id === panel._id ? "#2563eb" : "#e5e7eb"}`,
                  background: selectedPanel?._id === panel._id ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                    {panel.courseName}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    {panel.teachers.length} teacher{panel.teachers.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePanel(panel._id, panel.courseName);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        {/* Right: panel detail */}
        {selectedPanel ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <h3 style={{ fontWeight: "700", marginBottom: "4px" }}>
              {selectedPanel.courseName}
            </h3>
            <p style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "20px" }}>
              {selectedPanel.teachers.length} panel member
              {selectedPanel.teachers.length !== 1 ? "s" : ""}
            </p>

            {/* Add teacher */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  flexGrow: 1,
                  minWidth: "200px",
                  fontSize: "0.9rem",
                }}
              >
                <option value="">Select teacher to add</option>
                {availableTeachers.map((t) => (
                  <option key={t.email} value={t.email}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddTeacher}
                disabled={loading || !selectedTeacher}
                style={{
                  padding: "8px 18px",
                  background: loading || !selectedTeacher ? "#9ca3af" : "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: loading || !selectedTeacher ? "not-allowed" : "pointer",
                  fontWeight: "600",
                }}
              >
                Add
              </button>
            </div>

            {/* Teachers list */}
            {selectedPanel.teachers.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                No teachers in this panel yet.
              </p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", borderRadius: "6px 0 0 6px" }}>
                      Name
                    </th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>Email</th>
                    <th style={{ padding: "8px 12px", borderRadius: "0 6px 6px 0" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPanel.teachers.map((t) => (
                    <tr key={t.email} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "10px 12px", fontWeight: "500" }}>{t.name}</td>
                      <td style={{ padding: "10px 12px", color: "#6b7280" }}>{t.email}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <button
                          onClick={() => handleRemoveTeacher(t.email, t.name)}
                          disabled={loading}
                          style={{
                            background: "none",
                            border: "1px solid #ef4444",
                            color: "#ef4444",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              border: "1px dashed #d1d5db",
              borderRadius: "10px",
              fontSize: "0.95rem",
            }}
          >
            Select a panel to manage its teachers
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanelManagement;
