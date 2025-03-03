import React, { useState, useEffect } from "react";
import "../index.css";
import HighlightedText from "./postEdit/HighlightedText";
import { PostEditContainer } from "./postEdit/PostEditContainer";
import { ScoringContainer } from "./scoring/ScoringContainer";
import { DatabaseSentenceView } from "./scoring/DatabaseSentenceView";
import { useSpanEvalContext } from "./SpanEvalProvider";
import { HighlightedError } from "../types";
import { LoginForm } from "./scoring/LoginForm";

import logo from "../assets/logo.svg";

// Type Definitions
type DatasetType = {
  mandarin_dataset: any[];
  cantonese_dataset: any[];
};

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

  const [username, setUsername] = useState<string | null>("");
  const [sentenceID, setSentenceID] = useState<string | null>("undefined_id");
  const [currentDatabase, setCurrentDatabase] = useState<string | null>("");

  // Dataset
  const [dataset, setDataset] = useState<DatasetType | null>(null);

  const [sentenceData, setSentenceData] = useState<
    {
      _id: string;
      id: number;
      src: string;
      mt: string;
      ref: string;
      annotations: Object;
    }[]
  >([]);

  const [modifiedText, setModifiedText] =
    React.useState<string>(machineTranslation);
  const [addedErrorSpans, setAddedErrorSpans] = React.useState<
    HighlightedError[]
  >([]);
  const [overallScore, setOverallScore] = React.useState<number>(50);

  // console.log(curEntryIdx);

  // const [diffContent, setDiffContent] =
  //   useState<React.ReactNode>(machineTranslation);

  const handleDiffTextUpdate = (parsedDiff: React.ReactNode) => {
    setDiffContent(parsedDiff);
  };

  const handleGoToLastAnnotation = () => {
    const annotationKey = `${username}_annotations`;
    const lastCompletedIndex = sentenceData
      .map((item, index) => ({
        index,
        completed: item.annotations && item.annotations[annotationKey],
      }))
      .reverse()
      .find((item) => item.completed);

    if (lastCompletedIndex) {
      const lastUnannotatedSentence =
        sentenceData[lastCompletedIndex.index + 1];
      setOrigText(lastUnannotatedSentence.src);
      setTranslatedText(lastUnannotatedSentence.mt);
      setDiffContent(lastUnannotatedSentence.mt);
      setSentenceID(lastUnannotatedSentence._id);
      setModifiedText(lastUnannotatedSentence.mt);

      // Remove active class from all rows first
      document.querySelectorAll('[class^="db-row-"]').forEach((row) => {
        row.classList.remove("active-db-row");
      });

      // Find the row element that was clicked on
      const rowElement = document.querySelector(
        `.db-row-${lastUnannotatedSentence.id}`
      );
      // Apply highlight to the clicked row
      if (rowElement) {
        rowElement.classList.add("active-db-row");
        // Scroll the row into view
        rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleSubmitAnnotation = () => {
    // Create the annotation object

    // // Scroll to the database viewer
    // const dbViewerElement = document.querySelector(".db-sentence-view");
    // if (dbViewerElement) {
    //   dbViewerElement.scrollIntoView({
    //     behavior: "smooth",
    //     block: "start",
    //   });
    // }

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
      dataset: currentDatabase,
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

    // After successful submission, find the next unannotated sentence
    const currentIndex = sentenceData.findIndex(
      (item) => item._id === sentenceID
    );
    const nextSentence = sentenceData
      .slice(currentIndex + 1)
      .find(
        (item) =>
          !item.annotations || !item.annotations[`${username}_annotations`]
      );

    if (nextSentence) {
      // Automatically select the next unannotated sentence
      setOrigText(nextSentence.src);
      setTranslatedText(nextSentence.mt);
      setDiffContent(nextSentence.mt);
      setSentenceID(nextSentence._id);
      setModifiedText(nextSentence.mt);
    }

    // Remove active class from all rows first
    document.querySelectorAll('[class^="db-row-"]').forEach((row) => {
      row.classList.remove("active-db-row");
    });

    // Find the row element that was clicked on
    const rowElement = document.querySelector(`.db-row-${nextSentence.id}`);
    // Apply highlight to the clicked row
    if (rowElement) {
      rowElement.classList.add("active-db-row");
      // Scroll the row into view
      // rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Reset States
    setOverallScore(50);
    setErrorSpans([]);
    // setSpanSeverity("Minor");
    setSpanSeverity("");
    setTranslatedText(machineTranslation);

    // Update sentenceData row for live staus update
    console.log("AH", packageHighlightedErrors);
    setSentenceData((prevData) => {
      return prevData.map((row) =>
        row._id === sentenceID
          ? {
              ...row,
              annotations: { [annotationKey]: packageHighlightedErrors },
            }
          : row
      );
    });
  };

  // **JSX**
  return (
    <div className="body">
      <div className="logo-nav-container">
        <img className="logo_1" src={logo} alt="" />
      </div>
      {/* DB Viewer */}
      <div className="divider"></div>

      <div className="annotate-container">
        {username ? (
          <div className="annotate-container-annotate">
            <DatabaseSentenceView
              setOrigText={setOrigText}
              setTranslatedText={setTranslatedText}
              setDiffContent={setDiffContent}
              setModifedText={setModifiedText}
              username={username}
              setUsername={setUsername}
              sentenceID={sentenceID}
              setSentenceID={setSentenceID}
              setCurrentDatabase={setCurrentDatabase}
              sentenceData={sentenceData}
              setSentenceData={setSentenceData}
              dataset={dataset}
              setDataset={setDataset}
            />
            <div className="go-to-last-annotated-button-container">
              <button
                className="go-to-last-annotated-button"
                onClick={handleGoToLastAnnotation}
              >
                Go To Last Annotated
              </button>
            </div>
            <div className="divider"></div>
            <div className="source-mt-sentence-display">
              <div className="source-sentence-display-text">
                <h3>Source</h3>
                <HighlightedText
                  text={referenceTranslation}
                  // text={machineTranslation}
                  highlights={originalHighlightedError!}
                  highlightKey="end_index_orig"
                  disableEdit={true}
                />
              </div>
              <div className="machine-translation-display-text">
                <h3>Machine Translation</h3>
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
            </div>
            <div className="divider"></div>
            {/* Scoring Section */}
            {/* <ScoringContainer
              overallScore={overallScore}
              setOverallScore={setOverallScore}
            /> */}
            <PostEditContainer
              machineTranslation={machineTranslation}
              setMachineTranslation={setTranslatedText}
              highlightedError={highlightedError!}
              setHighlightedError={setErrorSpans}
              onDiffTextUpdate={handleDiffTextUpdate}
              modifiedText={modifiedText}
              setModifiedText={setModifiedText}
              addedErrorSpans={addedErrorSpans}
              setAddedErrorSpans={setAddedErrorSpans}
            />
            {/* Translation Submission Section */}
            <div className="accept-translation-section">
              {/* <button onClick={() => setEntryIdx(curEntryIdx + 1)}> */}
              <button onClick={() => handleSubmitAnnotation()}>
                Submit Annotation
              </button>
            </div>
          </div>
        ) : (
          <div className="annotate-container-login">
            <LoginForm
              setDataset={setDataset}
              setSentenceData={setSentenceData}
              setDBUsername={setUsername}
            ></LoginForm>
          </div>
        )}

        <div className="footer">
          <div className="divider"></div>
          <div>
            {/* <button className="reset-entry-button" onClick={() => setEntryIdx(0)}>
          Restart to entry #0
          </button> */}
          </div>
          <div className="send-feedback">
            <a>Send Feedback</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
