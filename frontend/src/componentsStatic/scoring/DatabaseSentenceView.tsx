import React, { useState, useEffect } from "react";
import "../../index.css";
import sentences from "../../../public/mandarin_dataset.json";
import checkmark from "../../assets/checkmark.svg";
import cross from "../../assets/x_cross.svg";
import { generateDiff } from "../postEdit/PostEditContainer"
import { UserSelectorDropdown } from "../scoring/UserSelector";

// Type Definitions
type DatasetType = {
  mandarin_dataset: any[];
  cantonese_dataset: any[];
  shanghainese_dataset: any[];
  cantonese_pivot_dataset: any[];
};

type DatabaseSentenceViewProps = {
  setOrigText: React.Dispatch<React.SetStateAction<string>>;
  setTranslatedText: React.Dispatch<React.SetStateAction<string>>;
  setDiffContent: React.Dispatch<React.SetStateAction<React.ReactNode>>;
  setModifedText: React.Dispatch<React.SetStateAction<string>>;
  username: string;
  annotator: string;
  setAnnotator: React.Dispatch<React.SetStateAction<string>>;
  sentenceID: string;
  setSentenceID: React.Dispatch<React.SetStateAction<string>>;
  setCurrentDatabase: React.Dispatch<React.SetStateAction<string>>;
  setAddedErrorSpans: React.Dispatch<React.SetStateAction<any[]>>;
  setHighlightedError: React.Dispatch<React.SetStateAction<any[]>>;
  sentenceData: any[];
  setSentenceData: React.Dispatch<any>;
  setDataset: React.Dispatch<React.SetStateAction<DatasetType | null>>;
  dataset: DatasetType | null;
  qaMode: boolean;
  setQAMode: React.Dispatch<React.SetStateAction<boolean>>;
  activeLanguage: string;
  setActiveLanguage: React.Dispatch<React.SetStateAction<string>>;
  forceScroll: boolean;
  setForceScroll: React.Dispatch<React.SetStateAction<boolean>>;
};

export const DatabaseSentenceView: React.FC<DatabaseSentenceViewProps> = ({
  setOrigText,
  setTranslatedText,
  setDiffContent,
  setModifedText,
  username,
  annotator,
  setAnnotator,
  sentenceID,
  setSentenceID,
  setCurrentDatabase,
  setAddedErrorSpans,
  setHighlightedError,
  sentenceData,
  setSentenceData,
  setDataset,
  dataset,
  qaMode,
  setQAMode,
  activeLanguage,
  setActiveLanguage,
  forceScroll,
  setForceScroll
}) => {
  const [row_active, setRow_active] = useState<boolean>(false);

  const mandarin_annotators = ["Hannah", "RuntongLiang", "qianshi2"];
  const cantonese_annotators = ["loka9", "Phantom65536", 
                                "wingspecialist", "ethanc"];

  const bug_sentence = 'On Monday, scientists from the Stanford University School of Medicine ' + 
                       'announced the invention of a new diagnostic tool that can sort cells by ' + 
                       'type: a tiny printable chip that can be manufactured using standard '+
                       'inkjet printers for possibly about one U.S. cent each.'

  // Function to scroll to the current sentence in the database view
  const scrollToCurrentSentence = (sentenceId: string) => {
    const currentSentence = sentenceData.find(item => item._id === sentenceId);
    if (currentSentence) {
      const rowElement = document.querySelector(`.db-row-${currentSentence.id}`) as HTMLElement;
      if (rowElement) {
        const dbViewContainer = document.querySelector('.db-sentence-view') as HTMLElement;
        if (dbViewContainer) {
          // Calculate the scroll offset to center
          const rowTop = rowElement.offsetTop;
          const containerHeight = dbViewContainer.clientHeight;
          const rowHeight = rowElement.clientHeight;
          
          const targetScrollTop = rowTop - (containerHeight / 2) + (rowHeight / 2);
          
          dbViewContainer.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        }
      }
    }
  };

  // Effect to scroll to current sentence when sentenceID changes or forceScroll is triggered
  useEffect(() => {
    if (sentenceID && sentenceID !== "undefined_id") {
      scrollToCurrentSentence(sentenceID);
    }
  }, [sentenceID, sentenceData, forceScroll]);

  // Reset forceScroll after it's been used
  useEffect(() => {
    if (forceScroll) {
      setForceScroll(false);
    }
  }, [forceScroll, setForceScroll]);

  // useEffect(() => {
  //   fetch("/mandarin_dataset.json")
  //     .then((response) => {
  //       if (!response.ok) {
  //         throw new Error("Failed to fetch data");
  //       }
  //       console.log("AH YEAH");
  //       return response.json();
  //     })
  //     .then((data) => setSentenceData(data))
  //     .catch((error) => {
  //       console.error("Error loading json sentence data", error);
  //     });
  // }, []);

  const handleSentenceRowClick = (item: any) => {
    // Remove active class from all rows first
    document.querySelectorAll('[class^="db-row-"]').forEach((row) => {
      row.classList.remove("active-db-row");
    });

    // Find the row element that was clicked on
    const rowElement = document.querySelector(`.db-row-${item.id}`);
    // Apply highlight to the clicked row
    if (rowElement) {
      rowElement.classList.add("active-db-row");
    }

    console.log("AH CLICKED ROW");
    console.log(item);
    setOrigText(item.src);
    setTranslatedText(item.mt);
    setDiffContent(item.mt);
    setSentenceID(item._id);
    setModifedText(item.mt);
    setAddedErrorSpans([]);
    setHighlightedError([]);

    if (`${username}_annotations` in item.annotations) {
      handlePrevAnnotation(item);
    }
  };

  const handlePrevAnnotation = (item: any) => {
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

  const handleDatabaseFetch = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    const target = e.target as HTMLButtonElement;
    const language = target.innerText;
    console.log(language);
    setActiveLanguage(language);

    if (!dataset) {
      console.error("Dataset is undefined");
    } else if (language === "Mandarin") {
      const fullData = dataset.mandarin_dataset ?? [];
      setSentenceData(fullData);
      setCurrentDatabase("annotation-tool-dataset");
    } else if (language === "Cantonese") {
      // Check if user should use pivot dataset
      const un = username.trim().toLowerCase();
      const isPivot = un === 'aiden';
      console.log("isPivot:", isPivot);
      setSentenceData(isPivot ? dataset.cantonese_pivot_dataset ?? [] : dataset.cantonese_dataset ?? []);
      setCurrentDatabase(isPivot ? "annotation-tool-cantonese-pivot" : "annotation-tool-cantonese");
    }
  };

  return (
    <div className="db-sentence-view-parent">
      <div>
        <button
          className={`language-dataset-button ${
            activeLanguage == "Mandarin" ? "active" : ""
          }`}
          onClick={handleDatabaseFetch}
        >
          Mandarin
        </button>
        <button
          className={`language-dataset-button ${
            activeLanguage == "Cantonese" ? "active" : ""
          }`}
          onClick={handleDatabaseFetch}
        >
          Cantonese
        </button>
        <button
          className={`language-dataset-button ${
            activeLanguage == "Shanghainese" ? "active" : ""
          }`}
          onClick={handleDatabaseFetch}
        >
          Shanghainese
        </button>
        {/* <button
          className={`language-dataset-button ${
            activeLanguage == "Hakka" ? "active" : ""
          }`}
          onClick={handleDatabaseFetch}
        >
          Hakka
        </button>
        <button
          className={`language-dataset-button ${
            activeLanguage == "Hokkien" ? "active" : ""
          }`}
          onClick={handleDatabaseFetch}
        >
          Hokkien
        </button> */}
      </div>

      <div className="db-sentence-view">
        {/* <table className="db-sentence-view-table"> */}
        <table>
          <thead>
            {/* <tr className="first-header">
            <th>
              <button
                className={`language-dataset-button ${
                  activeLanguage == "Mandarin" ? "active" : ""
                }`}
                onClick={handleDatabaseFetch}
              >
                Mandarin
              </button>
            </th>
            <th>
              <button
                className={`language-dataset-button ${
                  activeLanguage == "Cantonese" ? "active" : ""
                }`}
                onClick={handleDatabaseFetch}
              >
                Cantonese
              </button>
            </th>
            <th></th>
            <th></th>
            <th></th>
          </tr> */}
            {/* <tr className="second-header"> */}
            <tr className="first-header">
              <th>Index</th>
              <th>Sentence</th>
              <th>MT</th>
              <th>Reference</th>
              <th>Complete</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {sentenceData.length > 0 ? (
              sentenceData.map((item) => (
                <tr
                  className={`db-row-${item.id} ${
                    row_active ? "active-db-row" : ""
                  }`}
                  onClick={() => handleSentenceRowClick(item)}
                  key={item.id}
                >
                  <td className="index-cell">{item.id}</td>
                  <td className="sentence-cell">{item.src}</td>
                  <td className="sentence-cell">{item.mt}</td>
                  <td className="sentence-cell">{item.ref}</td>
                  <td className="status-cell">
                    {item.annotations &&
                    item.annotations.hasOwnProperty(
                      `${annotator}_annotations`
                    ) ? (
                      <img
                        className="annotation-checkmark"
                        src={checkmark}
                        alt=""
                      />
                    ) : (
                      <img className="annotation-cross" src={cross} alt="" />
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="db-no-data-row">
                <td className="db-no-data-cell" colSpan={5}>
                  <h3 className="db-no-data-text">
                    Please Select a Database Language...
                  </h3>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
