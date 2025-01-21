import React from "react";
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
    translatedText: machineTranslation,
    originalSpans: originalHighlightedError,
    errorSpans: highlightedError,
    curEntryIdx,
    setEntryIdx,
    diffContent,
    setDiffContent,
  } = useSpanEvalContext();

  console.log(curEntryIdx);

  // const [diffContent, setDiffContent] =
  //   useState<React.ReactNode>(machineTranslation);

  const handleDiffTextUpdate = (parsedDiff: React.ReactNode) => {
    setDiffContent(parsedDiff);
  };

  // **JSX**
  return (
    <div className="body">
      <img className="logo_1" src={logo} alt="" />
      {/* DB Viewer */}
      <DatabaseSentenceView />

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
      />
      {/* Scoring Section */}
      <ScoringContainer />
      <div className="accept-translation-section">
        <button onClick={() => setEntryIdx(curEntryIdx + 1)}>
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
