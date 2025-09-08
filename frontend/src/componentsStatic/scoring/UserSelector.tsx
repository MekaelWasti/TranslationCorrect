import React, { useState } from "react";
import "../../index.css";

type UserSelectorProps = {
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  item: any;
  setDiffContent: React.Dispatch<React.SetStateAction<React.ReactNode>>;
  setModifedText: React.Dispatch<React.SetStateAction<string>>;
  setAddedErrorSpans: React.Dispatch<React.SetStateAction<any[]>>;
  setHighlightedError: React.Dispatch<React.SetStateAction<any[]>>;
  generateDiff: (
    original: string, 
    modified: string, 
    setModifiedText: (newText: string) => void, 
    setDiffContent: (newDiffContent: React.ReactNode) => void
  ) => void;
};

// **ScoringContainer Component**
export const UserSelectorDropdown: React.FC<UserSelectorProps> = ({
  username,
  setUsername,
  item,
  setDiffContent,
  setModifedText,
  setAddedErrorSpans,
  setHighlightedError,
  generateDiff
}) => {

  // **Functions**
  const handleUserChange = (user: string) => {
    setUsername(user);

    // Fetching the previous annotation data
    console.log("user has done this annotation already, loading previously submitted annotation");
    const prev_annotation = item.annotations[`${username}_annotations`];
    console.log("previous annotation data:", prev_annotation);

    // Displays the corrected version of the sentence done by the annotators
    setDiffContent(prev_annotation.corrected_sentence);
    setModifedText(prev_annotation.corrected_sentence);

    // setAddedErrorSpans and setHighlightedError use different namings of attributes
    // so we accomodate for that here
    console.log("spans before mapping:", prev_annotation.annotatedSpans);
    const modified_spans = prev_annotation.annotatedSpans.map(span => ({
      ...span,
      original_text: span.error_text_segment,
      start_index_translation: span.start_index,
      end_index_translation: span.end_index,
    }));
    console.log("new spans:", modified_spans);
    
    // This gives us the spans
    setAddedErrorSpans(modified_spans);
    setHighlightedError(modified_spans);

    // This gives us the diff in the machine translation portion
    generateDiff(item.mt, prev_annotation.corrected_sentence, setModifedText, setDiffContent);
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
          name="user-dropdown"
          id="user_dropdown"
          value={username}
          onChange={(e) =>
            handleUserChange(e.target.value)
          }
        >
          <option value="loka9">loka9</option>
          <option value="Phantom65536">Phantom65536</option>
          <option value="wingspecialist">wingspecialist</option>
          <option value="ethanc">ethanc</option>
          <option value="beatricengsw">beatricengsw</option>
          <option value="york">york</option>
          <option value="Aiden">Aiden</option>
        </select>
      </div>
    </div>
  );
};
