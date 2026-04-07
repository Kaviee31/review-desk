import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { toast } from "react-toastify";
import { API_BASE_URL } from "./TeacherDashboard";
import "../styles/PanelReviewPage.css";

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
  }, [teacherEmail]);

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
    <div className="prp-container">
      <h2 className="prp-title">Panel Review</h2>

      {panels.length === 0 ? (
        <div className="prp-empty">You are not assigned to any panel yet.</div>
      ) : (
        <>
          {/* Panel dropdown — always visible */}
          <div className="prp-panel-row">
            <label className="prp-panel-label">Panel:</label>
            <select
              value={selectedPanel?._id || ""}
              onChange={(e) => {
                const panel = panels.find((p) => p._id === e.target.value);
                if (panel) selectPanel(panel);
              }}
              className="prp-panel-select"
            >
              {panels.map((panel) => (
                <option key={panel._id} value={panel._id}>
                  {panel.courseName}
                </option>
              ))}
            </select>
          </div>

          {loadingStudents ? (
            <p className="prp-loading">Loading students...</p>
          ) : (
            <>
              {/* ── Search + page-size row ── */}
              <div className="prp-search-row">
                <div className="prp-search-inner">
                  <span className="prp-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by register number or name..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="prp-search-input"
                  />
                </div>
                <div className="prp-page-size">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    className="prp-page-size-select"
                  >
                    <option value={5}>5</option>
                    <option value={7}>7</option>
                  </select>
                  <span>per page</span>
                </div>
              </div>

              {/* ── Student table — fixed height + internal scroll ── */}
              <div className="prp-table-wrapper">
                <div className="prp-table-scroll">
                  <table className="prp-table">
                    <thead>
                      <tr className="prp-thead-row">
                        <th className="prp-th">Register Number</th>
                        <th className="prp-th">Student Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="prp-td-empty">
                            No students enrolled.
                          </td>
                        </tr>
                      ) : filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="prp-td-empty">
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
                              className={`prp-tr${isSelected ? " prp-tr--selected" : i % 2 !== 0 ? " prp-tr--alt" : ""}`}
                            >
                              <td className="prp-td-register">
                                {s.registerNumber}
                              </td>
                              <td className="prp-td-name">{s.studentName}</td>
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
                <div className="prp-pagination">
                  <span>
                    Showing{" "}
                    {Math.min((currentPage - 1) * pageSize + 1, filteredStudents.length)}–
                    {Math.min(currentPage * pageSize, filteredStudents.length)} of{" "}
                    {filteredStudents.length} students
                  </span>

                  <div className="prp-page-buttons">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="prp-page-btn"
                    >
                      ← Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`prp-page-btn${currentPage === page ? " prp-page-btn--active" : ""}`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="prp-page-btn"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {/* ── Marks entry section — below the table ── */}
              {expandedStudent && (
                <div ref={marksRef} className="prp-marks-section">
                  {/* Header */}
                  <div className="prp-marks-header">
                    <div>
                      <h3 className="prp-marks-title">
                        Marks for {expandedStudent.studentName}
                      </h3>
                      <span className="prp-marks-register">
                        {expandedStudent.registerNumber}
                      </span>
                    </div>
                    <button
                      onClick={handleCloseMarks}
                      title="Close"
                      className="prp-close-btn"
                    >
                      ×
                    </button>
                  </div>

                  {loadingMarks ? (
                    <p className="prp-loading-marks">Loading marks...</p>
                  ) : rounds.length === 0 ? (
                    <p className="prp-no-criteria">
                      No review criteria set by coordinator yet.
                    </p>
                  ) : (
                    <>
                      {/* Marks table */}
                      <div className="prp-marks-table-scroll">
                        <table className="prp-marks-table">
                          <thead>
                            <tr className="prp-marks-thead-row">
                              {rounds.includes(1) && (
                                <>
                                  <th className="prp-marks-th">Review Item (R1)</th>
                                  <th className="prp-marks-th prp-marks-th--center">R1 Max</th>
                                  <th className="prp-marks-th prp-marks-th--wide">R1 Awarded</th>
                                </>
                              )}
                              {rounds.includes(2) && (
                                <>
                                  <th className="prp-marks-th">Review Item (R2)</th>
                                  <th className="prp-marks-th prp-marks-th--center">R2 Max</th>
                                  <th className="prp-marks-th prp-marks-th--wide">R2 Awarded</th>
                                </>
                              )}
                              {rounds.includes(3) && (
                                <>
                                  <th className="prp-marks-th">Review Item (R3)</th>
                                  <th className="prp-marks-th prp-marks-th--center">R3 Max</th>
                                  <th className="prp-marks-th prp-marks-th--wide">R3 Awarded</th>
                                </>
                              )}
                            </tr>
                          </thead>

                          <tbody>
                            {coordCriteria.map((item, idx) => (
                              <tr
                                key={idx}
                                className={`prp-marks-tr${idx % 2 !== 0 ? " prp-marks-tr--alt" : ""}`}
                              >
                                {rounds.includes(1) && (
                                  <>
                                    <td className="prp-marks-td">{item.r1_desc}</td>
                                    <td className="prp-marks-td prp-marks-td--center">{item.r1_mark}</td>
                                    <td className="prp-marks-td prp-marks-td--center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={item.r1_mark}
                                        value={markInputs[idx]?.r1_mark ?? 0}
                                        onChange={(e) =>
                                          handleMarkChange(idx, "r1_mark", e.target.value)
                                        }
                                        className="prp-marks-input"
                                      />
                                    </td>
                                  </>
                                )}
                                {rounds.includes(2) && (
                                  <>
                                    <td className="prp-marks-td">{item.r2_desc}</td>
                                    <td className="prp-marks-td prp-marks-td--center">{item.r2_mark}</td>
                                    <td className="prp-marks-td prp-marks-td--center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={item.r2_mark}
                                        value={markInputs[idx]?.r2_mark ?? 0}
                                        onChange={(e) =>
                                          handleMarkChange(idx, "r2_mark", e.target.value)
                                        }
                                        className="prp-marks-input"
                                      />
                                    </td>
                                  </>
                                )}
                                {rounds.includes(3) && (
                                  <>
                                    <td className="prp-marks-td">{item.r3_desc}</td>
                                    <td className="prp-marks-td prp-marks-td--center">{item.r3_mark}</td>
                                    <td className="prp-marks-td prp-marks-td--center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={item.r3_mark}
                                        value={markInputs[idx]?.r3_mark ?? 0}
                                        onChange={(e) =>
                                          handleMarkChange(idx, "r3_mark", e.target.value)
                                        }
                                        className="prp-marks-input"
                                      />
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>

                          {/* Totals footer */}
                          <tfoot>
                            <tr className="prp-tfoot-row">
                              {rounds.includes(1) && (
                                <>
                                  <td className="prp-marks-td prp-marks-td--right" colSpan={2}>
                                    Total Awarded (R1):
                                  </td>
                                  <td className="prp-marks-td prp-marks-td--center">
                                    {totalFor("r1_mark")}
                                  </td>
                                </>
                              )}
                              {rounds.includes(2) && (
                                <>
                                  <td className="prp-marks-td prp-marks-td--right" colSpan={2}>
                                    Total Awarded (R2):
                                  </td>
                                  <td className="prp-marks-td prp-marks-td--center">
                                    {totalFor("r2_mark")}
                                  </td>
                                </>
                              )}
                              {rounds.includes(3) && (
                                <>
                                  <td className="prp-marks-td prp-marks-td--right" colSpan={2}>
                                    Total Awarded (R3):
                                  </td>
                                  <td className="prp-marks-td prp-marks-td--center">
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
                        <div className="prp-averages">
                          {rounds.map((r) => {
                            const agg = getAggregateForRound(r);
                            return agg !== null ? (
                              <div key={r} className="prp-avg-badge">
                                Panel avg R{r}: {agg} marks &nbsp;·&nbsp;{" "}
                                {existingMarks.filter((m) => m.reviewNumber === r).length}{" "}
                                submission(s)
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="prp-actions">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="prp-btn-save"
                        >
                          {saving ? "Saving..." : "Save Marks"}
                        </button>
                        <button
                          onClick={handleCloseMarks}
                          className="prp-btn-cancel"
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

export default PanelReviewPage;
