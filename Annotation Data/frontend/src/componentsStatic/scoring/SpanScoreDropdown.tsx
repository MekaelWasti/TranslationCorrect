import React from "react";
import "../../index.css";
import { useSpanEvalContext } from "../SpanEvalProvider";

// **ScoringContainer Component**
export const SpanScoreDropdown: React.FC = () => {
  // **Functions**
  const { selectedSpanIdx, spanScores, setSpanScores } = useSpanEvalContext();
  const handleSpanScoreChange = (index: number, score: number) => {
    setSpanScores((prevScores) => ({ ...prevScores, [index]: score }));
  };

  //   Return JSX
  return (
    <div className="span-score-section">
      {/* TODO: Update title */}
      <h3>{selectedSpanIdx} Span Score</h3>
      <div className="span-severity-dropdown-section">
        <select name="span-severitiy-dropdown" id="span_severities">
          <option value="Minor">Minor</option>
          <option value="Major">Major</option>
        </select>
      </div>
    </div>
  );
};
