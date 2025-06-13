import React, { useState } from "react";
import "../styles/CoordinatorDashboard.css";

function CoordinatorDashboard() {
  const [formData, setFormData] = useState({
    // Review 1 marks (initial values from image)
    r1_item1_marks: "",
    r1_item2_marks: "",
    r1_item3_marks: "",
    r1_item4_marks: "",
    r1_total_marks: "",
    // Review 2 marks (initial values from image)
    r2_item1_marks: "",
    r2_item2_marks: "",
    r2_item3_marks: "",
    r2_item4_marks: "",
    r2_total_marks: "",
    // Review 3 marks (initial values from image)
    r3_item1_marks: "",
    r3_item2_marks: "",
    r3_item3_marks: "",
    r3_total_marks: "",
  });

  // State for dynamic extra rows
  const [extraRowsCount, setExtraRowsCount] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleExtraRowsChange = (e) => {
    const count = Number(e.target.value);
    setExtraRowsCount(isNaN(count) ? 0 : Math.max(0, count)); // Ensure non-negative number
  };

  const renderExtraRows = () => {
    const rows = [];
    const fixedRowsReview1 = 4; // Number of fixed items for Review 1
    const fixedRowsReview2 = 4; // Number of fixed items for Review 2
    const fixedRowsReview3 = 3; // Number of fixed items for Review 3

    for (let i = 0; i < extraRowsCount; i++) {
      const currentItemNumberR1 = 1 + i;
      const currentItemNumberR2 = 1 + i;
      const currentItemNumberR3 = 1 + i;

      rows.push(
        <tr key={`extra-row-${i}`}>
          <td className="narrow-col">{currentItemNumberR1}</td> {/* Global numbering */}
          <td className="description-col">
            <input type="text" className="table-cell-input" placeholder="Enter description" />
          </td>
          <td className="marks-col">
            <input type="number" className="marks-input" placeholder="0" />
          </td>
          <td className="narrow-col">{currentItemNumberR2}</td>
          <td className="description-col">
            <input type="text" className="table-cell-input" placeholder="Enter description" />
          </td>
          <td className="marks-col">
            <input type="number" className="marks-input" placeholder="0" />
          </td>
          <td className="narrow-col">{currentItemNumberR3}</td>
          <td className="description-col">
            <input type="text" className="table-cell-input" placeholder="Enter description" />
          </td>
          <td className="marks-col">
            <input type="number" className="marks-input" placeholder="0" />
          </td>
        </tr>
      );
    }
    return rows;
  };

  return (
    <div className="coordinator-dashboard">

      {/* Input for number of extra rows */}
      <div className="extra-rows-input-section">
        <label htmlFor="extraRows">Add extra review items (n): </label>
        <input
          type="number"
          id="extraRows"
          value={extraRowsCount}
          onChange={handleExtraRowsChange}
          min="0"
          className="num-rows-input"
        />
      </div>

      <div className="dynamic-table-container">
        <table>
          <thead>
           <tr>

           </tr>

            {/* Main Review Headers */}
            <tr>
              <th className="narrow-col"></th> {/* Empty cell for global numbering */}
              <th colSpan="2" className="center-text review-header">
                REVIEW 1
              </th>
              <th colSpan="3" className="center-text review-header">
                REVIEW 2
              </th>
              <th colSpan="3" className="center-text review-header">
                REVIEW 3
              </th>
            </tr>
          </thead>
          <tbody>


            {/* Dynamically generated extra rows */}
            {renderExtraRows()}

            {/* Total Row */}
            <tr>
              <td colSpan="2" className="bold-text total-cell">
                TOTAL
              </td>
              <td className="bold-text marks-col">
                <input
                  type="number" // Changed to number
                  name="r1_total_marks"
                  value={formData.r1_total_marks}
                  onChange={handleInputChange}
                  className="marks-input bold-text"
                />
              </td>
              <td colSpan="2" className="bold-text total-cell">
                TOTAL
              </td>
              <td className="bold-text marks-col">
                <input
                  type="number" // Changed to number
                  name="r2_total_marks"
                  value={formData.r2_total_marks}
                  onChange={handleInputChange}
                  className="marks-input bold-text"
                />
              </td>
              <td colSpan="2" className="bold-text total-cell">
                TOTAL
              </td>
              <td className="bold-text marks-col">
                <input
                  type="number" // Changed to number
                  name="r3_total_marks"
                  value={formData.r3_total_marks}
                  onChange={handleInputChange}
                  className="marks-input bold-text"
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