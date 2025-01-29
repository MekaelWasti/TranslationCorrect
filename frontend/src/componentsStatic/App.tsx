import React, { useState } from "react";
import "../index.css";
import HighlightedText from "./postEdit/HighlightedText";
import { PostEditContainer } from "./postEdit/PostEditContainer";
import { ScoringContainer } from "./scoring/ScoringContainer";
import { DatabaseSentenceView } from "./scoring/DatabaseSentenceView";
import { useSpanEvalContext } from "./SpanEvalProvider";
import logo from "../assets/logo.svg";

const App: React.FC = () => {
  const {
    origText: referenceTranslation,
    setOrigText,
    translatedText: machineTranslation,
    setTranslatedText,
    originalSpans: originalHighlightedError,
    errorSpans: highlightedError,
    setErrorSpans,
    curEntryIdx,
    setEntryIdx,
    diffContent,
    setDiffContent,
    spanSeverity,
    setSpanSeverity,
    spanScores,
    setSpanScores,
  } = useSpanEvalContext();

  const [username, setUsername] = useState<string | null>("undefined_user");
  const [sentenceID, setSentenceID] = useState<string | null>("undefined_id");

  const [modifiedText, setModifiedText] =
    React.useState<string>(machineTranslation);
  const [addedErrorSpans, setAddedErrorSpans] = React.useState<[] | any>([]);
  const [overallScore, setOverallScore] = React.useState<number>(50);

  // console.log(curEntryIdx);

  // const [diffContent, setDiffContent] =
  //   useState<React.ReactNode>(machineTranslation);

  const handleDiffTextUpdate = (parsedDiff: React.ReactNode) => {
    setDiffContent(parsedDiff);
  };

  const handleSubmitAnnotation = () => {
    // Create the annotation object
    console.log(username);

    const packageHighlightedErrors = {
      annotatedSpans: highlightedError.map(
        ({
          original_text: error_text_segment,
          start_index_translation: start_index,
          end_index_translation: end_index,
          error_type,
          error_severity,
        }) => ({
          error_text_segment,
          start_index,
          end_index,
          error_type,
          error_severity,
        })
      ),
      overall_translation_score: overallScore,
      corrected_sentence: modifiedText,
    };

    console.log(packageHighlightedErrors);

    const annotationKey = `${username}_annotations`;

    const requestBody = {
      id: sentenceID,
      [annotationKey]: packageHighlightedErrors, // Dynamic key placement
    };

    console.log(requestBody);

    // Submit the annotation object

    fetch(
      "https://translation-correct-annotation-task-dutd.vercel.app/api/submit_annotation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    )
      .then((response) => response.json())
      .then((data) => {
        console.log("Success:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });

    // Reset States
    setOverallScore(50);
    setErrorSpans([]);
    setSpanSeverity("Minor");
    setTranslatedText(machineTranslation);
  };

  // **JSX**
  return (
    <div className="body">
      <img className="logo_1" src={logo} alt="" />
      {/* DB Viewer */}
      <DatabaseSentenceView
        setOrigText={setOrigText}
        setTranslatedText={setTranslatedText}
        setDiffContent={setDiffContent}
        username={username}
        setUsername={setUsername}
        setSentenceID={setSentenceID}
      />

      <div className="divider"></div>
      <h3>Source</h3>
      <div>
        <HighlightedText
          text={referenceTranslation}
          // text={machineTranslation}
          highlights={originalHighlightedError!}
          highlightKey="end_index_orig"
          disableEdit={true}
        />
      </div>
      <br />
      <br />
      <h3>Machine Translation</h3>
      <div>
        <div className="machine-translation-output">
          {diffContent && (
            <HighlightedText
              text={diffContent}
              // text={machineTranslation}
              highlights={originalHighlightedError!}
              highlightKey="end_index_translation"
              disableEdit={true}
            />
          )}
        </div>
      </div>
      <div className="divider"></div>
      <PostEditContainer
        machineTranslation={machineTranslation}
        highlightedError={highlightedError!}
        onDiffTextUpdate={handleDiffTextUpdate}
        setModifiedText={setModifiedText}
        addedErrorSpans={addedErrorSpans}
        setAddedErrorSpans={setAddedErrorSpans}
      />
      {/* Scoring Section */}
      <ScoringContainer
        overallScore={overallScore}
        setOverallScore={setOverallScore}
      />
      <div className="accept-translation-section">
        {/* <button onClick={() => setEntryIdx(curEntryIdx + 1)}> */}
        <button onClick={() => handleSubmitAnnotation()}>
          Submit Annotation
        </button>
      </div>
      <div className="divider"></div>
      <div>
        <button onClick={() => setEntryIdx(0)}>Restart to entry #0</button>
      </div>
      <div className="send-feedback">
        <a>Send Feedback</a>
      </div>
    </div>
  );
};

export default App;
