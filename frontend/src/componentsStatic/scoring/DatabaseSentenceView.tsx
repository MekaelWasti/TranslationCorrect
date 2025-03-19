import React, { useState, useEffect } from "react";
import "../../index.css";
import sentences from "../../../public/mandarin_dataset.json";
import checkmark from "../../assets/checkmark.svg";
import cross from "../../assets/x_cross.svg";
import { generateDiff } from "../postEdit/PostEditContainer"
// Type Definitions
type DatasetType = {
  mandarin_dataset: any[];
  cantonese_dataset: any[];
};

const dummy_data = {
  "_id": "67b69d6870364bd2b0e04e14",
  "id": 1,
  "src": "On Monday, scientists from the Stanford University School of Medicine announced the invention of a new diagnostic tool that can sort cells by type: a tiny printable chip that can be manufactured using standard inkjet printers for possibly about one U.S. cent each.",
  "mt": "星期一,斯坦福大學醫學院嘅科學家宣布發明咗一個可以按類型排序細胞嘅新診斷工具 一個細嘅可打印芯片 可以用標準嘅喷墨打印機 製造成一美分鐘",
  "ref": "星期一，史丹福大學醫學院嘅科學家宣佈，佢哋發明咗一種可以對細胞進行分類嘅新診斷工具：用標準噴墨打印機製造嘅微型可打印晶片，每塊晶片嘅價格大概係 1 美仙。",
  "annotations": {
    "ethan": {
      "cheung@mail": {
        "utoronto": {
          "ca_annotations": {
            "annotatedSpans": [],
            "overall_translation_score": 50,
            "corrected_sentence": "星期一,斯坦福大學醫學院嘅科學家宣布發明咗一個可以按類型排序細胞嘅新診斷工具 一個細嘅可打印芯片 可以用標準嘅喷墨打印機 製造成一美分鐘"
          }
        }
      }
    },
    "Mekael_annotations": {
      "annotatedSpans": [
        {
          "error_text_segment": "細嘅",
          "start_index": 41,
          "end_index": 43,
          "error_type": "Addition",
          "error_severity": "Minor"
        }
      ],
      "overall_translation_score": 50,
      "corrected_sentence": "星期一,斯坦福大學醫學院嘅科學家宣布發明咗一個可以按類型排序細胞嘅新診斷工具 一個細嘅可打印芯片 可以用標準嘅喷墨打印機 製造成一美分鐘"
    },
    "loka9_annotations": {
      "annotatedSpans": [
        {
          "error_text_segment": "，",
          "start_index": 3,
          "end_index": 4,
          "error_type": "Grammar",
          "error_severity": "Minor"
        },
        {
          "error_text_segment": "佢哋",
          "start_index": 18,
          "end_index": 20,
          "error_type": "Omission",
          "error_severity": "Minor"
        },
        {
          "error_text_segment": "對細胞進行分類",
          "start_index": 27,
          "end_index": 34,
          "error_type": "Mistranslation",
          "error_severity": "Minor"
        },
        {
          "error_text_segment": "用標準噴墨打印機製造嘅微型可打印晶片，每塊晶片嘅價格大概係 1 美仙。 \n",
          "start_index": 43,
          "end_index": 80,
          "error_type": "Mistranslation",
          "error_severity": "Minor"
        }
      ],
      "overall_translation_score": 50,
      "corrected_sentence": "星期一，斯坦福大學醫學院嘅科學家宣布佢哋發明咗一個可以對細胞進行分類嘅新診斷工具：一個用標準噴墨打印機製造嘅微型可打印晶片，每塊晶片嘅價格大概係 1 美仙。 \n\n\n\n"
    },
    "Phantom65536_annotations": {
      "annotatedSpans": [
        {
          "error_text_segment": "成",
          "start_index": 63,
          "end_index": 64,
          "error_type": "Omission",
          "error_severity": "Minor"
        }
      ],
      "overall_translation_score": 50,
      "corrected_sentence": "星期一,斯坦福大學醫學院嘅科學家宣布發明咗一個可以按類型排序細胞嘅新診斷工具 一個細嘅可打印芯片 可以用標準嘅喷墨打印機 製造成本為一美仙"
    },
    "wingspecialist_annotations": {
      "annotatedSpans": [
        {
          "error_text_segment": "史丹福",
          "start_index": 4,
          "end_index": 7,
          "error_type": "Mistranslation",
          "error_severity": "Minor"
        },
        {
          "error_text_segment": "佢係",
          "start_index": 39,
          "end_index": 41,
          "error_type": "Addition",
          "error_severity": "Minor"
        },
        {
          "error_text_segment": "噴",
          "start_index": 57,
          "end_index": 58,
          "error_type": "Spelling",
          "error_severity": "Minor"
        },
        {
          "error_text_segment": "每塊大約價值一美金",
          "start_index": 65,
          "end_index": 74,
          "error_type": "Mistranslation",
          "error_severity": "Minor"
        }
      ],
      "overall_translation_score": 50,
      "corrected_sentence": "星期一,史丹福大學醫學院嘅科學家宣布發明咗一個可以按類型排序細胞嘅新診斷工具。佢係一個細嘅可打印芯片，可以用標準嘅噴墨打印機製造，每塊大約價值一美金"
    }
  }
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
      console.log("user has done this annotation already, loading previously submitted annotation");
      const prev_annotation = item.annotations[`${username}_annotations`];
      console.log("previous annotation data:");
      console.log(prev_annotation);
      // setDiffContent(prev_annotation.corrected_sentence);
      // setModifedText(prev_annotation.corrected_sentence);
      // setAddedErrorSpans(prev_annotation);
      // setHighlightedError(prev_annotation);

    }

    // "Phantom65536_annotations": {
    //   "annotatedSpans": [
    //     {
    //       "error_text_segment": "成",
    //       "start_index": 63,
    //       "end_index": 64,
    //       "error_type": "Omission",
    //       "error_severity": "Minor"
    //     }
    //   ],
    //   "overall_translation_score": 50,
    //   "corrected_sentence": "星期一,斯坦福大學醫學院嘅科學家宣布發明咗一個可以按類型排序細胞嘅新診斷工具 一個細嘅可打印芯片 可以用標準嘅喷墨打印機 製造成本為一美仙"
    // },

    const dummy = dummy_data.annotations.Phantom65536_annotations;
    console.log("previous annotation data:", dummy);
    setDiffContent(dummy.corrected_sentence);
    setModifedText(dummy.corrected_sentence);
    console.log("spans before mapping:", dummy.annotatedSpans);
    const modified_dummy_spans = dummy.annotatedSpans.map(span => ({
      ...span,
      original_text: span.error_text_segment,
      start_index_translation: span.start_index,
      end_index_translation: span.end_index,
    }));
    console.log("new spans:", modified_dummy_spans);
    setAddedErrorSpans(modified_dummy_spans);
    setHighlightedError(modified_dummy_spans);
    generateDiff(dummy_data.mt, dummy.corrected_sentence, setModifedText, setDiffContent);
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
      setSentenceData(dataset.mandarin_dataset ?? []);
      setCurrentDatabase("annotation-tool-dataset");
    } else if (language === "Cantonese") {
      setSentenceData(dataset.cantonese_dataset ?? []);
      setCurrentDatabase("annotation-tool-cantonese");
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
