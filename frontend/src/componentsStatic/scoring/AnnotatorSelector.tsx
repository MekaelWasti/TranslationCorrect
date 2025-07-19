import React, { useState } from "react";
import "../../index.css";

type AnnotatorSelectorProps = {
  username: string;
  annotator: string;
  setAnnotator: React.Dispatch<React.SetStateAction<string>>;
  sentenceData: any;
  sentenceID: string;
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
  activeLanguage: string;
};

// **ScoringContainer Component**
export const AnnotatorSelectorDropdown: React.FC<AnnotatorSelectorProps> = ({
  username,
  annotator,
  setAnnotator,
  sentenceData,
  sentenceID,
  setDiffContent,
  setModifedText,
  setAddedErrorSpans,
  setHighlightedError,
  generateDiff,
  activeLanguage,
}) => {

  // **Functions**
  const handleAnnotatorChange = (annotator: string) => {
    const item = sentenceData.find(sentence => sentence._id === sentenceID);
    console.log("item:", item);
    setAnnotator(annotator);
    console.log("user:", annotator);
    console.log("username:", username);

    // Fetching the previous annotation data
    console.log("annotator has done this annotation already, loading previously submitted annotation");
    var prev_annotation = item.annotations[`${annotator}_annotations`];
    if (!prev_annotation) {
        console.log("no previous sentence, giving a blank annotation")
        prev_annotation = {
            annotatedSpans: [],
            corrected_sentence: item.mt,
            overall_translation_score: 50
        };
    }
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
      {activeLanguage === "Cantonese" && (
        <div className="">
          <select
            name="user-dropdown"
            id="user_dropdown"
            value={annotator}
            onChange={(e) =>
              handleAnnotatorChange(e.target.value)
            }
          >
            <option value="loka9">loka9</option>
            <option value="Phantom65536">Phantom65536</option>
            <option value="wingspecialist">wingspecialist</option>
            <option value="ethanc">ethanc</option>
          </select>
        </div>
      )}
      {activeLanguage === "Mandarin" && (
        <div className="">
          <select
            name="user-dropdown"
            id="user_dropdown"
            value={annotator}
            onChange={(e) =>
              handleAnnotatorChange(e.target.value)
            }
          >
            <option value="RuntongLiang">RuntongLiang</option>
            <option value="Hannah">Hannah</option>
            <option value="qianshi2">qianshi2</option>
          </select>
        </div>
      )}
    </div>
  );
};