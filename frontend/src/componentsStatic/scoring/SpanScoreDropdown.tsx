import React, { useState } from "react";
import "../../index.css";
import { useSpanEvalContext } from "../SpanEvalProvider";

// **ScoringContainer Component**
export const SpanScoreDropdown: React.FC = () => {
  // **Functions**

  const { selectedSpanIdx, spanSeverity, setSpanSeverity, updateSpanSeverity } =
    useSpanEvalContext();
  const handleSpanScoreChange = (index: number, severity: string) => {
    setSpanSeverity(severity);
    updateSpanSeverity(index, severity);
  };

  //   Return JSX
  return (
    <div className="span-score-section">
      {/* TODO: Update title */}
      {/* <h3>{selectedSpanIdx} Span Error Severity</h3> */}
      {/* <h4>{selectedSpanIdx} Span Error Severity</h4> */}
      {/* <div className="span-severity-dropdown-section">
        <select
          name="span-severitiy-dropdown"
          id="span_severities"
          value={spanSeverity}
          onChange={(e) =>
            handleSpanScoreChange(selectedSpanIdx, e.target.value)
          }
        >
          <option value="Minor">Minor</option>
          <option value="Major">Major</option>
        </select>
      </div> */}
      <div className="">
        <select
          name="span-severitiy-dropdown"
          id="span_severities"
          value={spanSeverity}
          onChange={(e) =>
            handleSpanScoreChange(selectedSpanIdx, e.target.value)
          }
        >
          <option value="Minor">Minor</option>
          <option value="Major">Major</option>
        </select>
      </div>
    </div>
  );
};
