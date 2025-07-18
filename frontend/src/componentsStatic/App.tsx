import React, { useState, useEffect } from "react";
import "../index.css";
import HighlightedText from "./postEdit/HighlightedText";
import { generateDiff, PostEditContainer } from "./postEdit/PostEditContainer";
import { ScoringContainer } from "./scoring/ScoringContainer";
import { DatabaseSentenceView } from "./scoring/DatabaseSentenceView";
import { useSpanEvalContext } from "./SpanEvalProvider";
import { HighlightedError } from "../types";
import { LoginForm } from "./scoring/LoginForm";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AnnotatorSelectorDropdown } from "./scoring/AnnotatorSelector";

import logo from "../assets/logo.svg";

// Type Definitions
type DatasetType = {
  mandarin_dataset: any[];
  cantonese_dataset: any[];
  shanghainese_dataset: any[];
  cantonese_pivot_dataset: any[];
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

  // Drill baby drill
  const [username, setUsername] = useState<string | null>("");
  const [annotator, setAnnotator] = useState<string | null>("");
  const [sentenceID, setSentenceID] = useState<string | null>("undefined_id");
  const [currentDatabase, setCurrentDatabase] = useState<string | null>("");
  const [activeLanguage, setActiveLanguage] = useState("Mandarin");

  const [qaMode, setQAMode] = useState(false);

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

      // Show success toast
      toast.success("Navigated to the next unannotated sentence");
    } else {
      // Show info toast if no more unannotated sentences
      toast.info("No more unannotated sentences found");
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

    const selectElement = document.querySelector(".span-score-section select");
    if (selectElement) {
      (selectElement as HTMLElement).style.backgroundColor = "#222222";
      (selectElement as HTMLElement).style.color = "#ffffff";
      (selectElement as HTMLSelectElement).value = "Minor";
    }

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

    let annotationKey = `${username}_annotations`;

    if (qaMode) {
      annotationKey = `${username}_qa`;
      packageHighlightedErrors['annotator'] = annotator;
    }
    
    const requestBody = {
      dataset: currentDatabase,
      id: sentenceID,
      [annotationKey]: packageHighlightedErrors, // Dynamic key placement
    };

    console.log(requestBody);

    // Submit the annotation object
    // Show loading toast
    const toastId = toast.loading("Submitting annotation...");

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
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Success:", data);
        // Update the loading toast to a success toast
        toast.update(toastId, {
          render: "Annotation submitted successfully!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
          closeButton: true,
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
        // setTranslatedText(machineTranslation);

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
      })
      .catch((error) => {
        console.error("Error:", error);
        // Update the loading toast to an error toast
        toast.update(toastId, {
          render: `Error submitting annotation: ${error.message}`,
          type: "error",
          isLoading: false,
          autoClose: 5000,
          closeButton: true,
        });
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
              setAddedErrorSpans={setAddedErrorSpans}
              setHighlightedError={setErrorSpans}
              username={username}
              annotator={annotator}
              setAnnotator={setAnnotator}
              sentenceID={sentenceID}
              setSentenceID={setSentenceID}
              setCurrentDatabase={setCurrentDatabase}
              sentenceData={sentenceData}
              setSentenceData={setSentenceData}
              dataset={dataset}
              setDataset={setDataset}
              qaMode={qaMode}
              setQAMode={setQAMode}
              activeLanguage={activeLanguage}
              setActiveLanguage={setActiveLanguage}
            />
            <div className='annotator-selector'>
              {qaMode && (
                <AnnotatorSelectorDropdown
                  username={username}
                  annotator={annotator}
                  setAnnotator={setAnnotator}
                  sentenceData={sentenceData}
                  sentenceID={sentenceID}
                  setDiffContent={setDiffContent}
                  setModifedText={setModifiedText}
                  setAddedErrorSpans={setAddedErrorSpans}
                  setHighlightedError={setErrorSpans}
                  generateDiff={generateDiff}
                  activeLanguage={activeLanguage}
                />
              )}
            </div>
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
              // highlightedError={highlightedError!}
              // setHighlightedError={setErrorSpans}
              onDiffTextUpdate={handleDiffTextUpdate}
              modifiedText={modifiedText}
              setModifiedText={setModifiedText}
              // addedErrorSpans={addedErrorSpans}
              // setAddedErrorSpans={setAddedErrorSpans}
              diffContent={diffContent}
              setDiffContent={setDiffContent}
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
              setAnnotator={setAnnotator}
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
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default App;
