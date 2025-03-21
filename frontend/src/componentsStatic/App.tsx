import React, { useState, useEffect } from "react";
import "../index.css";
import HighlightedText from "./postEdit/HighlightedText";
import { PostEditContainer } from "./postEdit/PostEditContainer";
import { ScoringContainer } from "./scoring/ScoringContainer";
import { DatabaseSentenceView } from "./scoring/DatabaseSentenceView";
import { useSpanEvalContext } from "./SpanEvalProvider";
import { HighlightedError } from "../types";
import { LoginForm } from "./scoring/LoginForm";
import { ErrorSuggestion } from "./ErrorSuggestion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import logo from "../assets/logo.svg";

// Type Definitions
type DatasetType = {
  mandarin_dataset: any[];
  cantonese_dataset: any[];
  japanese_dataset: any[];
  mandarin_v2_dataset: any[];
};

const App: React.FC = () => {
  const {
    origText: sourceText,
    setOrigText,
    translatedText: machineTranslation,
    setTranslatedText,
    referenceText,
    setReferenceText,
    originalSpans: originalHighlightedError,
    setOriginalSpans,
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

  // Timer states
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [displayTime, setDisplayTime] = useState<string>("00:00");

  // Function to start the annotation timer
  const startAnnotationTimer = () => {
    setTimerActive(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    setDisplayTime("00:00");
    toast.info("Annotation timer started");
  };

  // Update timer display while active
  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;

    if (timerActive && startTime) {
      timerInterval = setInterval(() => {
        const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(currentElapsed);

        // Format time as mm:ss
        const minutes = Math.floor(currentElapsed / 60);
        const seconds = currentElapsed % 60;
        setDisplayTime(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        );
      }, 1000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [timerActive, startTime]);

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
    // Stop timer if active and calculate final duration
    let annotationDuration = 0;
    if (timerActive && startTime) {
      annotationDuration = Math.floor((Date.now() - startTime) / 1000);
      setTimerActive(false);
      setStartTime(null);
      setElapsedTime(0);
      setDisplayTime("00:00");
    }

    // Create the annotation object
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
      annotation_time_seconds: annotationDuration, // Add time data to submission
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
        }

        // Reset States
        setOverallScore(50);
        setErrorSpans([]);
        setSpanSeverity("");

        // Update sentenceData row for live status update
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
        {timerActive && (
          <div className="annotation-timer-display">
            <span>Time: {displayTime}</span>
          </div>
        )}
      </div>
      {/* DB Viewer */}
      <div className="divider"></div>

      <div className="annotate-container">
        {username ? (
          <div className="annotate-container-annotate">
            <DatabaseSentenceView
              setOrigText={setOrigText}
              setTranslatedText={setTranslatedText}
              setReferenceText={setReferenceText}
              setDiffContent={setDiffContent}
              setModifedText={setModifiedText}
              setAddedErrorSpans={setAddedErrorSpans}
              setHighlightedError={setErrorSpans}
              username={username}
              setUsername={setUsername}
              sentenceID={sentenceID}
              setSentenceID={setSentenceID}
              setCurrentDatabase={setCurrentDatabase}
              sentenceData={sentenceData}
              setSentenceData={setSentenceData}
              dataset={dataset}
              setDataset={setDataset}
              // originalHighlightedError={originalHighlightedError}
              setOriginalHighlightedError={setOriginalSpans}
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

            <ErrorSuggestion
              sourceText={sourceText}
              machineTranslation={machineTranslation}
              referenceText={referenceText}
              // setReferenceText={setReferenceText}
              highlightedError={highlightedError}
              originalHighlightedError={originalHighlightedError}
              setTranslatedText={setTranslatedText}
              setErrorSpans={setErrorSpans}
              handleDiffTextUpdate={handleDiffTextUpdate}
              modifiedText={modifiedText}
              setModifiedText={setModifiedText}
              addedErrorSpans={addedErrorSpans}
              setAddedErrorSpans={setAddedErrorSpans}
              diffContent={diffContent}
              setDiffContent={setDiffContent}
              startAnnotationTimer={startAnnotationTimer}
              timerActive={timerActive}
            />
            <div className="divider"></div>
            {/* <div className="source-mt-sentence-display">
              <div className="source-sentence-display-text">
                <h2>Source</h2>
                <HighlightedText
                  text={referenceTranslation}
                  // text={machineTranslation}
                  highlights={originalHighlightedError!}
                  highlightKey="end_index_orig"
                  disableEdit={true}
                />
              </div>
              <div className="machine-translation-display-text">
                <h2>Machine Translation</h2>
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
            <div className="divider"></div> */}
            {/* Scoring Section */}
            {/* <ScoringContainer
              overallScore={overallScore}
              setOverallScore={setOverallScore}
            /> */}
            {/* <PostEditContainer
              machineTranslation={machineTranslation}
              setMachineTranslation={setTranslatedText}
              highlightedError={highlightedError!}
              setHighlightedError={setErrorSpans}
              onDiffTextUpdate={handleDiffTextUpdate}
              modifiedText={modifiedText}
              setModifiedText={setModifiedText}
              addedErrorSpans={addedErrorSpans}
              setAddedErrorSpans={setAddedErrorSpans}
              diffContent={diffContent}
              setDiffContent={setDiffContent}
            /> */}
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
