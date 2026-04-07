import React, { useState, useEffect } from "react";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import { courses } from "../constants/courses";
import { API_BASE_URL } from "./TeacherDashboard";
import "../styles/AdminPanelManagement.css";

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
    <div className="apm-container">
      <h2 className="apm-heading">Panel Management</h2>

      {/* Create Panel */}
      <div className="apm-create-card">
        <h3 className="apm-create-title">Create New Panel</h3>
        {availableCourses.length === 0 ? (
          <p className="apm-empty-msg">All courses already have a panel.</p>
        ) : (
          <div className="apm-create-row">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="apm-select"
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
              className="apm-btn-primary"
            >
              {creatingPanel ? "Creating..." : "Create Panel"}
            </button>
          </div>
        )}
      </div>

      {/* Panels List + Detail */}
      <div className="apm-grid">
        {/* Left: panels list */}
        <div>
          <h3 className="apm-section-title">
            All Panels ({panels.length})
          </h3>
          {panels.length === 0 ? (
            <p className="apm-no-items">No panels created yet.</p>
          ) : (
            panels.map((panel) => (
              <div
                key={panel._id}
                onClick={() => setSelectedPanel(panel)}
                className={`apm-panel-item${selectedPanel?._id === panel._id ? " apm-panel-item--selected" : ""}`}
              >
                <div>
                  <div className="apm-panel-name">{panel.courseName}</div>
                  <div className="apm-panel-meta">
                    {panel.teachers.length} teacher{panel.teachers.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePanel(panel._id, panel.courseName);
                  }}
                  className="apm-btn-delete"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        {/* Right: panel detail */}
        {selectedPanel ? (
          <div className="apm-detail-pane">
            <h3 className="apm-detail-title">{selectedPanel.courseName}</h3>
            <p className="apm-detail-subtitle">
              {selectedPanel.teachers.length} panel member
              {selectedPanel.teachers.length !== 1 ? "s" : ""}
            </p>

            {/* Add teacher */}
            <div className="apm-add-row">
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="apm-select apm-select--grow"
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
                className="apm-btn-success"
              >
                Add
              </button>
            </div>

            {/* Teachers list */}
            {selectedPanel.teachers.length === 0 ? (
              <p className="apm-no-items">No teachers in this panel yet.</p>
            ) : (
              <table className="apm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPanel.teachers.map((t) => (
                    <tr key={t.email}>
                      <td className="apm-td-name">{t.name}</td>
                      <td className="apm-td-email">{t.email}</td>
                      <td className="apm-td-action">
                        <button
                          onClick={() => handleRemoveTeacher(t.email, t.name)}
                          disabled={loading}
                          className="apm-btn-remove"
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
          <div className="apm-placeholder">
            Select a panel to manage its teachers
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanelManagement;
