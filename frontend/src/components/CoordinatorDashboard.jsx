import React, { useState, useEffect } from "react";
import "../styles/CoordinatorDashboard.css";

function CoordinatorDashboard() {
  const [extraRowsCount, setExtraRowsCount] = useState(0);
  const [extraRowsData, setExtraRowsData] = useState([]);

  const [totals, setTotals] = useState({
    r1_total: 0,
    r2_total: 0,
    r3_total: 0,
  });

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

  const handleExtraChange = (index, field, value) => {
    setExtraRowsData((prev) => {
      const updatedRow = { ...prev[index], [field]: value };
      const newData = [...prev];
      newData[index] = updatedRow;
      return newData;
    });
  };

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

  const handleExtraRowsCountChange = (e) => {
    const val = e.target.value;
    const numVal = Number(val);
    if (!isNaN(numVal) && numVal >= 0) {
      setExtraRowsCount(numVal);
    }
  };

  const renderExtraRows = () =>
    extraRowsData.map((row, index) => (
      <tr key={index} className="hover-row">
        {/* Only one '#' column - first review */}
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

        {/* Empty cell in place of # for Review 2 */}
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

        {/* Empty cell in place of # for Review 3 */}
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

  return (
    <div className="coordinator-dashboard" role="main">
      <h2>Coordinator Review Mark Entry</h2>
      <p>Enter number of additional review items and fill out their marks</p>

      <div className="extra-rows-input-section">
        <label htmlFor="extraRows">Add extra review items:</label>
        <input
          type="number"
          id="extraRows"
          value={extraRowsCount}
          onChange={handleExtraRowsCountChange}
          min="0"
          className="num-rows-input"
          aria-label="Number of extra review items"
          step="1"
          inputMode="numeric"
        />
      </div>

      <div className="dynamic-table-container" role="region" aria-labelledby="tableLabel">
        <table aria-describedby="tableDesc" aria-label="Review marks entry table">
          <thead>
            <tr>
              <th colSpan="3" className="review-header">
                Review 1
              </th>
              <th colSpan="3" className="review-header">
                Review 2
              </th>
              <th colSpan="3" className="review-header">
                Review 3
              </th>
            </tr>
            <tr>
              <th className="narrow-col" aria-label="Item Number">
                #
              </th>
              <th className="description-col">Description</th>
              <th className="marks-col">Marks</th>

              <th className="narrow-col" aria-hidden="true"></th>
              <th className="description-col">Description</th>
              <th className="marks-col">Marks</th>

              <th className="narrow-col" aria-hidden="true"></th>
              <th className="description-col">Description</th>
              <th className="marks-col">Marks</th>
            </tr>
          </thead>
          <tbody>
            {renderExtraRows()}

            <tr className="total-row">
              <td colSpan="2" className="total-cell">
                Total
              </td>
              <td>
                <input
                  type="text"
                  readOnly
                  value={totals.r1_total}
                  className="marks-input bold-text"
                  aria-label="Total marks for review 1"
                />
              </td>

              <td colSpan="2" className="total-cell">
                Total
              </td>
              <td>
                <input
                  type="text"
                  readOnly
                  value={totals.r2_total}
                  className="marks-input bold-text"
                  aria-label="Total marks for review 2"
                />
              </td>

              <td colSpan="2" className="total-cell">
                Total
              </td>
              <td>
                <input
                  type="text"
                  readOnly
                  value={totals.r3_total}
                  className="marks-input bold-text"
                  aria-label="Total marks for review 3"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CoordinatorDashboard;
