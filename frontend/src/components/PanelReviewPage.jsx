import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { toast } from "react-toastify";
import { API_BASE_URL } from "./TeacherDashboard";

function PanelReviewPage() {
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [students, setStudents] = useState([]);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [coordCriteria, setCoordCriteria] = useState([]);
  const [markInputs, setMarkInputs] = useState([]);
  const [existingMarks, setExistingMarks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingMarks, setLoadingMarks] = useState(false);

  // Search + pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);

  const marksRef = useRef(null);
  const auth = getAuth();
  const teacherEmail = auth.currentUser?.email;

  // Fetch panels; auto-select if only one
  useEffect(() => {
    if (!teacherEmail) return;
    axios
      .get(`${API_BASE_URL}/api/panels/teacher/${encodeURIComponent(teacherEmail)}`)
      .then(async (res) => {
        setPanels(res.data);
        if (res.data.length === 1) {
          await selectPanel(res.data[0]);
        }
      })
      .catch(() => toast.error("Failed to load your panels."));
  }, [teacherEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectPanel = async (panel) => {
    setSelectedPanel(panel);
    setExpandedStudent(null);
    setMarkInputs([]);
    setExistingMarks([]);
    setSearchQuery("");
    setCurrentPage(1);
    setLoadingStudents(true);
    try {
      const [studRes, coordRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/panel-students/${encodeURIComponent(panel.courseName)}`),
        axios.get(`${API_BASE_URL}/api/coordinator-review-data/${encodeURIComponent(panel.courseName)}`),
      ]);
      setStudents(studRes.data);
      setCoordCriteria(coordRes.data?.reviewData || []);
    } catch {
      toast.error("Failed to load panel data.");
    } finally {
      setLoadingStudents(false);
    }
  };

  // Which review rounds have criteria defined
  const enabledRounds = (criteria) =>
    [1, 2, 3].filter((r) => criteria.some((item) => Number(item[`r${r}_mark`]) > 0));

  // Filtered + paginated students
  const filteredStudents = students.filter(
    (s) =>
      s.registerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const pagedStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  // Select student — if same student clicked again, deselect
  const handleSelectStudent = async (student) => {
    if (expandedStudent?.registerNumber === student.registerNumber) {
      setExpandedStudent(null);
      setMarkInputs([]);
      setExistingMarks([]);
      return;
    }
    setExpandedStudent(student);
    setMarkInputs([]);
    setExistingMarks([]);
    setLoadingMarks(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/panel-marks/${selectedPanel._id}/${student.registerNumber}`
      );
      setExistingMarks(res.data);
      const myMarks = res.data.filter((pm) => pm.teacherEmail === teacherEmail);
      const byRound = {};
      myMarks.forEach((pm) => { byRound[pm.reviewNumber] = pm.marks; });
      const inputs = coordCriteria.map((_, idx) => ({
        r1_mark: Number(byRound[1]?.[idx]?.mark) || 0,
        r2_mark: Number(byRound[2]?.[idx]?.mark) || 0,
        r3_mark: Number(byRound[3]?.[idx]?.mark) || 0,
      }));
      setMarkInputs(inputs);
    } catch {
      toast.error("Failed to load existing marks.");
    } finally {
      setLoadingMarks(false);
      // Scroll marks section into view after state settles
      setTimeout(() => {
        marksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleMarkChange = (idx, key, value) => {
    const rNum = parseInt(key[1]);
    const maxMark = Number(coordCriteria[idx]?.[`r${rNum}_mark`]) || 100;
    const parsed = Math.min(Math.max(0, Number(value) || 0), maxMark);
    setMarkInputs((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [key]: parsed };
      return updated;
    });
  };

  const totalFor = (key) =>
    markInputs.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);

  const getAggregateForRound = (rNum) => {
    const roundMarks = existingMarks.filter((pm) => pm.reviewNumber === rNum);
    if (!roundMarks.length) return null;
    const totals = roundMarks.map((pm) =>
      pm.marks.reduce((s, m) => s + (Number(m.mark) || 0), 0)
    );
    return Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 100) / 100;
  };

  const handleSave = async () => {
    if (!expandedStudent || !selectedPanel) return;
    const rounds = enabledRounds(coordCriteria);
    if (!rounds.length) return toast.error("No criteria set for this panel.");
    setSaving(true);
    try {
      await Promise.all(
        rounds.map((rNum) => {
          const marks = coordCriteria.map((item, idx) => ({
            description: item[`r${rNum}_desc`] || item.description || `Criterion ${idx + 1}`,
            mark: markInputs[idx]?.[`r${rNum}_mark`] ?? 0,
          }));
          return axios.post(`${API_BASE_URL}/api/panel-marks`, {
            panelId: selectedPanel._id,
            courseName: selectedPanel.courseName,
            registerNumber: expandedStudent.registerNumber,
            teacherEmail,
            reviewNumber: rNum,
            marks,
          });
        })
      );
      toast.success(`Marks saved for ${expandedStudent.studentName}.`);
      const res = await axios.get(
        `${API_BASE_URL}/api/panel-marks/${selectedPanel._id}/${expandedStudent.registerNumber}`
      );
      setExistingMarks(res.data);
    } catch {
      toast.error("Failed to save marks.");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseMarks = () => {
    setExpandedStudent(null);
    setMarkInputs([]);
    setExistingMarks([]);
  };

  const rounds = enabledRounds(coordCriteria);

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "1.5rem", fontWeight: "700" }}>
        Panel Review
      </h2>

      {panels.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "#6b7280",
            border: "1px dashed #d1d5db",
            borderRadius: "10px",
          }}
        >
          You are not assigned to any panel yet.
        </div>
      ) : (
        <>
          {/* Panel dropdown — always visible */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <label
              style={{ fontSize: "0.875rem", fontWeight: "600", color: "#374151", whiteSpace: "nowrap" }}
            >
              Panel:
            </label>
            <select
              value={selectedPanel?._id || ""}
              onChange={(e) => {
                const panel = panels.find((p) => p._id === e.target.value);
                if (panel) selectPanel(panel);
              }}
              style={{
                padding: "8px 14px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.9rem",
                fontWeight: "600",
                color: "#1d4ed8",
                background: "#eff6ff",
                cursor: "pointer",
                outline: "none",
                minWidth: "180px",
              }}
            >
              {panels.map((panel) => (
                <option key={panel._id} value={panel._id}>
                  {panel.courseName}
                </option>
              ))}
            </select>
          </div>

          {loadingStudents ? (
            <p style={{ color: "#6b7280" }}>Loading students...</p>
          ) : (
            <>
              {/* ── Search + page-size row ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "10px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "200px" }}>
                  <span style={{ color: "#9ca3af", fontSize: "1rem" }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search by register number or name..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      outline: "none",
                      background: "#fff",
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#6b7280" }}>
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      background: "#fff",
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={7}>7</option>
                  </select>
                  <span>per page</span>
                </div>
              </div>

              {/* ── Student table — fixed height + internal scroll ── */}
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ maxHeight: "350px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ background: "#f3f4f6", position: "sticky", top: 0, zIndex: 1 }}>
                        <th
                          style={{
                            padding: "12px 20px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            borderBottom: "1px solid #e5e7eb",
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Register Number
                        </th>
                        <th
                          style={{
                            padding: "12px 20px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            borderBottom: "1px solid #e5e7eb",
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Student Name
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length === 0 ? (
                        <tr>
                          <td
                            colSpan={2}
                            style={{ padding: "32px", textAlign: "center", color: "#9ca3af" }}
                          >
                            No students enrolled.
                          </td>
                        </tr>
                      ) : filteredStudents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={2}
                            style={{ padding: "32px", textAlign: "center", color: "#9ca3af" }}
                          >
                            No students match &ldquo;{searchQuery}&rdquo;.
                          </td>
                        </tr>
                      ) : (
                        pagedStudents.map((s, i) => {
                          const isSelected =
                            expandedStudent?.registerNumber === s.registerNumber;
                          return (
                            <tr
                              key={s.registerNumber}
                              onClick={() => handleSelectStudent(s)}
                              style={{
                                background: isSelected
                                  ? "#eff6ff"
                                  : i % 2 === 0
                                  ? "#fff"
                                  : "#f9fafb",
                                borderLeft: isSelected
                                  ? "3px solid #2563eb"
                                  : "3px solid transparent",
                                borderBottom: "1px solid #e5e7eb",
                                cursor: "pointer",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected)
                                  e.currentTarget.style.background = "#f0f9ff";
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected)
                                  e.currentTarget.style.background =
                                    i % 2 === 0 ? "#fff" : "#f9fafb";
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px 20px",
                                  fontWeight: "500",
                                  color: isSelected ? "#1d4ed8" : "#111827",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {s.registerNumber}
                              </td>
                              <td
                                style={{
                                  padding: "12px 20px",
                                  color: isSelected ? "#1d4ed8" : "#374151",
                                  fontWeight: isSelected ? "600" : "400",
                                }}
                              >
                                {s.studentName}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Pagination controls ── */}
              {filteredStudents.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "12px",
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <span>
                    Showing{" "}
                    {Math.min((currentPage - 1) * pageSize + 1, filteredStudents.length)}–
                    {Math.min(currentPage * pageSize, filteredStudents.length)} of{" "}
                    {filteredStudents.length} students
                  </span>

                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        background: currentPage === 1 ? "#f3f4f6" : "#fff",
                        color: currentPage === 1 ? "#9ca3af" : "#374151",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      ← Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "6px",
                          border: `1px solid ${currentPage === page ? "#2563eb" : "#d1d5db"}`,
                          background: currentPage === page ? "#2563eb" : "#fff",
                          color: currentPage === page ? "#fff" : "#374151",
                          cursor: "pointer",
                          fontWeight: currentPage === page ? "600" : "400",
                          fontSize: "0.85rem",
                          minWidth: "32px",
                        }}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        background: currentPage === totalPages ? "#f3f4f6" : "#fff",
                        color: currentPage === totalPages ? "#9ca3af" : "#374151",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {/* ── Marks entry section — below the table ── */}
              {expandedStudent && (
                <div
                  ref={marksRef}
                  style={{
                    marginTop: "28px",
                    border: "1px solid #bfdbfe",
                    borderRadius: "10px",
                    background: "#f0f9ff",
                    padding: "20px 24px",
                    boxShadow: "0 2px 8px rgba(37,99,235,0.08)",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1rem",
                          fontWeight: "700",
                          color: "#1e3a8a",
                        }}
                      >
                        Marks for {expandedStudent.studentName}
                      </h3>
                      <span style={{ fontSize: "0.8rem", color: "#3b82f6" }}>
                        {expandedStudent.registerNumber}
                      </span>
                    </div>
                    <button
                      onClick={handleCloseMarks}
                      title="Close"
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "1.4rem",
                        cursor: "pointer",
                        color: "#6b7280",
                        lineHeight: 1,
                        padding: "4px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {loadingMarks ? (
                    <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Loading marks...</p>
                  ) : rounds.length === 0 ? (
                    <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                      No review criteria set by coordinator yet.
                    </p>
                  ) : (
                    <>
                      {/* Marks table */}
                      <div style={{ overflowX: "auto" }}>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.875rem",
                            background: "#fff",
                            borderRadius: "8px",
                            overflow: "hidden",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                          }}
                        >
                          <thead>
                            <tr style={{ background: "#e0e7ff" }}>
                              {rounds.includes(1) && (
                                <>
                                  <th style={thStyle}>Review Item (R1)</th>
                                  <th style={{ ...thStyle, width: "80px", textAlign: "center" }}>R1 Max</th>
                                  <th style={{ ...thStyle, width: "110px", textAlign: "center" }}>R1 Awarded</th>
                                </>
                              )}
                              {rounds.includes(2) && (
                                <>
                                  <th style={thStyle}>Review Item (R2)</th>
                                  <th style={{ ...thStyle, width: "80px", textAlign: "center" }}>R2 Max</th>
                                  <th style={{ ...thStyle, width: "110px", textAlign: "center" }}>R2 Awarded</th>
                                </>
                              )}
                              {rounds.includes(3) && (
                                <>
                                  <th style={thStyle}>Review Item (R3)</th>
                                  <th style={{ ...thStyle, width: "80px", textAlign: "center" }}>R3 Max</th>
                                  <th style={{ ...thStyle, width: "110px", textAlign: "center" }}>R3 Awarded</th>
                                </>
                              )}
                            </tr>
                          </thead>

                          <tbody>
                            {coordCriteria.map((item, idx) => (
                              <tr
                                key={idx}
                                style={{
                                  borderBottom: "1px solid #e5e7eb",
                                  background: idx % 2 === 0 ? "#fff" : "#f9fafb",
                                }}
                              >
                                {rounds.includes(1) && (
                                  <>
                                    <td style={tdStyle}>{item.r1_desc}</td>
                                    <td style={{ ...tdStyle, textAlign: "center" }}>{item.r1_mark}</td>
                                    <td style={{ ...tdStyle, textAlign: "center" }}>
                                      <input
                                        type="number"
                                        min={0}
                                        max={item.r1_mark}
                                        value={markInputs[idx]?.r1_mark ?? 0}
                                        onChange={(e) =>
                                          handleMarkChange(idx, "r1_mark", e.target.value)
                                        }
                                        style={inputStyle}
                                      />
                                    </td>
                                  </>
                                )}
                                {rounds.includes(2) && (
                                  <>
                                    <td style={tdStyle}>{item.r2_desc}</td>
                                    <td style={{ ...tdStyle, textAlign: "center" }}>{item.r2_mark}</td>
                                    <td style={{ ...tdStyle, textAlign: "center" }}>
                                      <input
                                        type="number"
                                        min={0}
                                        max={item.r2_mark}
                                        value={markInputs[idx]?.r2_mark ?? 0}
                                        onChange={(e) =>
                                          handleMarkChange(idx, "r2_mark", e.target.value)
                                        }
                                        style={inputStyle}
                                      />
                                    </td>
                                  </>
                                )}
                                {rounds.includes(3) && (
                                  <>
                                    <td style={tdStyle}>{item.r3_desc}</td>
                                    <td style={{ ...tdStyle, textAlign: "center" }}>{item.r3_mark}</td>
                                    <td style={{ ...tdStyle, textAlign: "center" }}>
                                      <input
                                        type="number"
                                        min={0}
                                        max={item.r3_mark}
                                        value={markInputs[idx]?.r3_mark ?? 0}
                                        onChange={(e) =>
                                          handleMarkChange(idx, "r3_mark", e.target.value)
                                        }
                                        style={inputStyle}
                                      />
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>

                          {/* Totals footer */}
                          <tfoot>
                            <tr style={{ background: "#f0fdf4", fontWeight: "700", fontSize: "0.85rem" }}>
                              {rounds.includes(1) && (
                                <>
                                  <td style={{ ...tdStyle, textAlign: "right" }} colSpan={2}>
                                    Total Awarded (R1):
                                  </td>
                                  <td style={{ ...tdStyle, textAlign: "center" }}>
                                    {totalFor("r1_mark")}
                                  </td>
                                </>
                              )}
                              {rounds.includes(2) && (
                                <>
                                  <td style={{ ...tdStyle, textAlign: "right" }} colSpan={2}>
                                    Total Awarded (R2):
                                  </td>
                                  <td style={{ ...tdStyle, textAlign: "center" }}>
                                    {totalFor("r2_mark")}
                                  </td>
                                </>
                              )}
                              {rounds.includes(3) && (
                                <>
                                  <td style={{ ...tdStyle, textAlign: "right" }} colSpan={2}>
                                    Total Awarded (R3):
                                  </td>
                                  <td style={{ ...tdStyle, textAlign: "center" }}>
                                    {totalFor("r3_mark")}
                                  </td>
                                </>
                              )}
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Panel averages */}
                      {rounds.some((r) => getAggregateForRound(r) !== null) && (
                        <div
                          style={{
                            marginTop: "14px",
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          {rounds.map((r) => {
                            const agg = getAggregateForRound(r);
                            return agg !== null ? (
                              <div
                                key={r}
                                style={{
                                  padding: "7px 14px",
                                  background: "#dcfce7",
                                  border: "1px solid #86efac",
                                  borderRadius: "8px",
                                  fontSize: "0.8rem",
                                  color: "#166534",
                                  fontWeight: "600",
                                }}
                              >
                                Panel avg R{r}: {agg} marks &nbsp;·&nbsp;{" "}
                                {existingMarks.filter((m) => m.reviewNumber === r).length}{" "}
                                submission(s)
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ marginTop: "18px", display: "flex", gap: "10px" }}>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          style={{
                            padding: "9px 22px",
                            borderRadius: "8px",
                            border: "none",
                            background: saving ? "#9ca3af" : "#16a34a",
                            color: "#fff",
                            fontWeight: "600",
                            fontSize: "0.875rem",
                            cursor: saving ? "not-allowed" : "pointer",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                            transition: "background 0.15s",
                          }}
                        >
                          {saving ? "Saving..." : "Save Marks"}
                        </button>
                        <button
                          onClick={handleCloseMarks}
                          style={{
                            padding: "9px 22px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            background: "#fff",
                            color: "#374151",
                            fontWeight: "600",
                            fontSize: "0.875rem",
                            cursor: "pointer",
                            transition: "background 0.15s",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// Shared style objects to avoid repetition
const thStyle = {
  padding: "10px 16px",
  textAlign: "left",
  fontWeight: "600",
  color: "#3730a3",
  borderBottom: "1px solid #c7d2fe",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const tdStyle = {
  padding: "10px 16px",
  color: "#374151",
  verticalAlign: "middle",
};

const inputStyle = {
  width: "72px",
  padding: "5px 8px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  textAlign: "center",
  fontSize: "0.875rem",
  background: "#fff",
  outline: "none",
};

export default PanelReviewPage;
