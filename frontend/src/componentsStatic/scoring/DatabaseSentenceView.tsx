import React, { useState, useEffect } from "react";
import "../../index.css";
import sentences from "../../../public/mandarin_dataset.json";
import checkmark from "../../assets/checkmark.svg";
import cross from "../../assets/x_cross.svg";
import { HighlightedError } from "../../types";
// Type Definitions
type DatasetType = {
  mandarin_dataset: any[];
  cantonese_dataset: any[];
  japanese_dataset: any[];
  mandarin_v2_dataset: any[];
};

type DatabaseSentenceViewProps = {
  setOrigText: React.Dispatch<React.SetStateAction<string>>;
  setTranslatedText: React.Dispatch<React.SetStateAction<string>>;
  setReferenceText: React.Dispatch<React.SetStateAction<string>>;
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
  setOriginalHighlightedError: React.Dispatch<
    React.SetStateAction<HighlightedError[]>
  >;
};

export const DatabaseSentenceView: React.FC<DatabaseSentenceViewProps> = ({
  setOrigText,
  setTranslatedText,
  setReferenceText,
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
  setOriginalHighlightedError,
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
    setReferenceText(item.ref);
    setDiffContent(item.mt);
    setSentenceID(item._id);
    setModifedText(item.mt);
    // setAddedErrorSpans(item.annotations.error_spans);

    if (item.annotations.error_spans) {
      setHighlightedError(item.annotations.error_spans);
      setOriginalHighlightedError(item.annotations.error_spans);
    }

    // setOriginalHighlightedError([
    //   {
    //     original_text: "The 935",
    //     error_type: "Omission",
    //     error_severity: "Major",
    //     start_index_orig: 12,
    //     end_index_orig: 19,
    //     start_index_translation: 6,
    //     end_index_translation: 9,
    //     correct_text:
    //       "The source phrase 'her side' refers to a group on her side, but the machine translation renders it as '彼女の党', which means 'her party' (a political party). This is a mistranslation of the intended meaning.",
    //   },
    //   {
    //     original_text: "The 935",
    //     error_type: "Mistranslation",
    //     error_severity: "Major",
    //     start_index_orig: 21,
    //     end_index_orig: 34,
    //     start_index_translation: 21,
    //     end_index_translation: 24,
    //     correct_text:
    //       "The source expression 'won the debate' is translated as '議論を勝ち取った'. Although similar in meaning, the more appropriate and idiomatic expression in the context is '議論に勝利した' as seen in the reference; hence, '勝ち取った' is a mistranslation that does not convey the intended nuance.",
    //   },
    // ]);

    // setHighlightedError([
    //   {
    //     error_type: "Mistranslation",
    //     error_severity: "Major",
    //     start_index_orig: 12,
    //     end_index_orig: 19,
    //     start_index_translation: 6,
    //     end_index_translation: 9,
    //     correct_text:
    //       "The source phrase 'her side' refers to a group on her side, but the machine translation renders it as '彼女の党', which means 'her party' (a political party). This is a mistranslation of the intended meaning.",
    //   },
    //   {
    //     error_type: "Mistranslation",
    //     error_severity: "Major",
    //     start_index_orig: 21,
    //     end_index_orig: 34,
    //     start_index_translation: 21,
    //     end_index_translation: 24,
    //     correct_text:
    //       "The source expression 'won the debate' is translated as '議論を勝ち取った'. Although similar in meaning, the more appropriate and idiomatic expression in the context is '議論に勝利した' as seen in the reference; hence, '勝ち取った' is a mistranslation that does not convey the intended nuance.",
    //   },
    // ]);
  };

  const handleDatabaseFetch = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    const target = e.target as HTMLButtonElement;
    const language = target.innerText;
    console.log(language);
    setActiveLanguage(language);

    console.log(dataset);

    if (!dataset) {
      console.error("Dataset is undefined");
    } else if (language === "Mandarin") {
      setSentenceData(dataset.mandarin_dataset ?? []);
      setCurrentDatabase("annotation-tool-dataset");
    } else if (language === "Cantonese") {
      setSentenceData(dataset.cantonese_dataset ?? []);
      setCurrentDatabase("annotation-tool-cantonese");
    } else if (language === "Japanese") {
      setSentenceData(dataset.japanese_dataset ?? []);
      setCurrentDatabase("annotation-tool-japanese");
    } else if (language === "Mandarin-v2") {
      setSentenceData(dataset.mandarin_v2_dataset ?? []);
      setCurrentDatabase("annotation-tool-mandarin-v2");
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
        </button>
        <button
          className={`language-dataset-button ${
            activeLanguage == "Japanese" ? "active" : ""
          }`}
          onClick={handleDatabaseFetch}
        >
          Japanese
        </button>
        <button
          className={`language-dataset-button ${
            activeLanguage == "Mandarin-v2" ? "active" : ""
          }`}
          onClick={handleDatabaseFetch}
        >
          Mandarin-v2
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
