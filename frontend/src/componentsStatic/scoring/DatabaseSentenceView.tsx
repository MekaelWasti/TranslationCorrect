import React, { useState, useEffect } from "react";
import "../../index.css";
import sentences from "../../../public/mandarin_dataset.json";
import checkmark from "../../assets/checkmark.svg";
import cross from "../../assets/x_cross.svg";
import { generateDiff } from "../postEdit/PostEditContainer"

/**
 * 📝 How to assign sentences to annotators:
 *
 * - Get annotators USERNAME (case-sensitive) to assign them a list of sentences.
 * - You can give a mix of:
 *    → one sentence (just a number, like 12)
 *    → or a range (in square brackets, like [5, 10])
 *
 * ✅ Examples:
 *   kim: [5, [10, 15], [30, 35], 44] → means kim gets:
 *     - sentence 5
 *     - sentences 10 to 15 (inclusive)
 *     - sentences 30 to 35 (inclusive)
 *     - and sentence 44
 *
 * ✅ Example format:
 *    const assignedMandarin = {
 *        kim: [1, [5, 10], 20],
 *        alice: [[15, 18], 25, 30],
 *        bob: [[40, 45]],
 *     };
 *
 * ⚠️ Indexing rules:
 *   - Mandarin and Shanghainese: start at 1
 *   - Cantonese: starts at 0
 *   → Just write the number you see in the dataset.
 *
 * 🔒 No overlaps unless on purpose, as it will show up more than once.
 */

type AssignedIndexes = Record<string, (number | [number, number])[]>;

const assignedMandarin: AssignedIndexes = {};
const assignedCantonese: AssignedIndexes = {};
const assignedShanghainese: AssignedIndexes = {};

// Type Definitions
type DatasetType = {
  mandarin_dataset: any[];
  cantonese_dataset: any[];
  shanghainese_dataset: any[];
};

type DatabaseSentenceViewProps = {
  setOrigText: React.Dispatch<React.SetStateAction<string>>;
  setTranslatedText: React.Dispatch<React.SetStateAction<string>>;
  setDiffContent: React.Dispatch<React.SetStateAction<React.ReactNode>>;
  setModifedText: React.Dispatch<React.SetStateAction<string>>;
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  sentenceID: string;
  setSentenceID: React.Dispatch<React.SetStateAction<string>>;
  setCurrentDatabase: React.Dispatch<React.SetStateAction<string>>;
  setAddedErrorSpans: React.Dispatch<React.SetStateAction<any[]>>;
  setHighlightedError: React.Dispatch<React.SetStateAction<any[]>>;
  sentenceData: any[];
  setSentenceData: React.Dispatch<any>;
  setDataset: React.Dispatch<React.SetStateAction<DatasetType | null>>;
  dataset: DatasetType | null;
};

export const DatabaseSentenceView: React.FC<DatabaseSentenceViewProps> = ({
  setOrigText,
  setTranslatedText,
  setDiffContent,
  setModifedText,
  username,
  setUsername,
  sentenceID,
  setSentenceID,
  setCurrentDatabase,
  setAddedErrorSpans,
  setHighlightedError,
  sentenceData,
  setSentenceData,
  setDataset,
  dataset,
}) => {
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);
  const [row_active, setRow_active] = useState<boolean>(false);

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

  // Helper function to expand assigned indexes
  const expandAssignedIndexes = (
    assignments: (number | [number, number])[],
    offset: number = 0
  ): number[] => {
    const result: number[] = [];
    for (const item of assignments) {
      if (typeof item === "number") {
        result.push(item + offset);
      } else {
        const [start, end] = item;
        for (let i = start; i <= end; i++) {
          result.push(i + offset);
        }
      }
    }
    return result;
  };

  // Helper function to handle assignment logic
  function handleAssignment(
    fullData: any[],
    username: string,
    assignments: Record<string, (number | [number, number])[]>,
    indexOffset: number,
    setSentenceData: (data: any[]) => void
  ) {
    if (username in assignments) {
      const assignedIndexes = assignments[username];
      const expandedIndexes = expandAssignedIndexes(
        assignedIndexes,
        indexOffset
      );
      const slicedData = expandedIndexes
        .filter((i) => i >= 0 && i < fullData.length)
        .map((i) => fullData[i]);
      setSentenceData(slicedData);
    } else {
      setSentenceData(fullData);
    }
  }

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
      handleAssignment(
        fullData,
        username,
        assignedMandarin,
        -1,
        setSentenceData
      );
      setCurrentDatabase("annotation-tool-dataset");
    } else if (language === "Cantonese") {
      const fullData = dataset.cantonese_dataset ?? [];
      handleAssignment(
        fullData,
        username,
        assignedCantonese,
        0,
        setSentenceData
      );
      setCurrentDatabase("annotation-tool-cantonese");
    } else if (language === "Shanghainese") {
      const fullData = dataset.shanghainese_dataset ?? [];
      handleAssignment(
        fullData,
        username,
        assignedShanghainese,
        -1,
        setSentenceData
      );
      setCurrentDatabase("annotation-tool-shanghainese");
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
        <button
          className={`language-dataset-button ${
            activeLanguage == "Shanghainese" ? "active" : ""
          }`}
          onClick={handleDatabaseFetch}
        >
          Shanghainese
        </button>
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
                      `${username}_annotations`
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
