import React, { useState, useEffect } from "react";
import { HighlightedError } from "../types";
import HighlightedText from "./postEdit/HighlightedText";
import { PostEditContainer } from "./postEdit/PostEditContainer";

type ErrorSuggestionProps = {
  sourceText: string;
  machineTranslation: string;
  referenceText: string;
  highlightedError: HighlightedError[];
  originalHighlightedError: HighlightedError[];
  setTranslatedText: (text: string) => void;
  setErrorSpans: (spans: HighlightedError[]) => void;
  handleDiffTextUpdate: (diffContent: React.ReactNode) => void;
  modifiedText: string;
  setModifiedText: (text: string) => void;
  addedErrorSpans: HighlightedError[];
  setAddedErrorSpans: (spans: HighlightedError[]) => void;
  diffContent: React.ReactNode;
  setDiffContent: (content: React.ReactNode) => void;
  startAnnotationTimer?: () => void;
  timerActive?: boolean;
};
export const ErrorSuggestion: React.FC<ErrorSuggestionProps> = ({
  sourceText,
  machineTranslation,
  referenceText,
  highlightedError,
  originalHighlightedError,
  setTranslatedText,
  setErrorSpans,
  handleDiffTextUpdate,
  modifiedText,
  setModifiedText,
  addedErrorSpans,
  setAddedErrorSpans,
  diffContent,
  setDiffContent,
  startAnnotationTimer,
  timerActive,
}) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const [errorSuggestion, setErrorSuggestion] = useState<string>("");
  const [errorSuggestionModel, setErrorSuggestionModel] =
    useState<string>("EC-1");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [sourceErrorSpans, setSourceErrorSpans] = useState<HighlightedError[]>(
    []
  );
  const [mtErrorSpans, setMtErrorSpans] = useState<HighlightedError[]>([]);

  const [tempErrorSpans, setTempErrorSpans] = useState<HighlightedError[]>([]);

  // const dummy =
  // '```json [ { "error_type": "Mistranslation", "severity": "major", "source_indices": [25, 33], "translation_indices": [21, 24] }, { "error_type": "Mistranslation", "severity": "major", "source_indices": [41, 55], "translation_indices": [39, 47] } ] ```';

  const dummy = {
    errors: [
      {
        error_type: "Mistranslation",
        severity: "major",
        source_indices: [36, 52],
        translation_indices: [26, 39],
        error_explanation:
          "The term 'Thrashers' was mistranslated as '戰士', which means 'Warriors' instead of the correct '鶇鳥'.",
      },
      {
        error_type: "Mistranslation",
        severity: "major",
        source_indices: [0, 6],
        translation_indices: [0, 1],
        error_explanation:
          "The term 'goals' was translated as '目標', which means 'objectives' instead of the correct term for 'goals' in the context of sports.",
      },
      {
        error_type: "Omission",
        severity: "major",
        source_indices: [12, 19],
        translation_indices: [19, 19],
        error_explanation:
          "The phrase 'assists' was omitted in the translation and only '2個助攻' is mentioned without reference to the original context.",
      },
      {
        error_type: "Omission",
        severity: "major",
        source_indices: [0, 52],
        translation_indices: [0, 39],
        error_explanation:
          "The translation does not capture the context of the game being a '5-3 win,' losing the clarity provided by '勝利中' in the original.",
      },
    ],
  };

  const dummy2 = {
    errors: [
      {
        error_type: "Mistranslation",
        severity: "major",
        source_indices: [36, 52],
        translation_indices: [26, 39],
        error_explanation:
          "The term 'Thrashers' was mistranslated as '戰士', which means 'Warriors' instead of the correct '鶇鳥'.",
      },
      {
        error_type: "Mistranslation",
        severity: "major",
        source_indices: [0, 6],
        translation_indices: [0, 1],
        error_explanation:
          "The term 'goals' was translated as '目標', which means 'objectives' instead of the correct term for 'goals' in the context of sports.",
      },
      {
        error_type: "Omission",
        severity: "major",
        source_indices: [12, 19],
        translation_indices: [19, 19],
        error_explanation:
          "The phrase 'assists' was omitted in the translation and only '2個助攻' is mentioned without reference to the original context.",
      },
      {
        error_type: "Omission",
        severity: "major",
        source_indices: [0, 52],
        translation_indices: [0, 39],
        error_explanation:
          "The translation does not capture the context of the game being a '5-3 win,' losing the clarity provided by '勝利中' in the original.",
      },
    ],
  };

  const getErrorSuggestion = async (
    sourceText: string,
    machineTranslation: string
  ) => {
    if (!apiKey) {
      console.error("API key is not defined");
      return;
    }

    setIsLoading(true);
    console.log(errorSuggestionModel);

    // ** Test Parsing **
    // console.log(dummy);

    // console.log(errorSuggestion);

    // const errorSuggestions = dummy2.errors.map((errors) => {
    //   return {
    //     original_text:
    //       "One time, he scored 2 goals and 2 assists in a 5-3 win over the Atlanta Thrashers.",
    //     translated_text:
    //       "佢喺華盛頓對亞特蘭大戰士嘅5-3勝利中 打咗2個目標同2個助攻。",
    //     correct_text: errors.error_explanation,
    //     start_index_orig: errors.source_indices[0],
    //     end_index_orig: errors.source_indices[1],
    //     start_index_translation: errors.translation_indices[0],
    //     end_index_translation: errors.translation_indices[1],
    //     error_type: errors.error_type,
    //     error_severity: errors.severity,
    //   };
    // });
    // ** Test Parsing **

    // console.log("OK");

    // console.log(errorSuggestions);

    // setSourceErrorSpans(errorSuggestions);
    // setMtErrorSpans(errorSuggestions);

    // Clear previous error spans
    setSourceErrorSpans([]);
    setMtErrorSpans([]);

    try {
      if (errorSuggestionModel === "EC-1") {
        fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            // model: "gpt-4o-mini",
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                // content: [
                //   {
                //     type: "text",
                //     text: 'You are a professional linguist specializing in machine translation evaluation.\nYour task is to analyze machine-translated texts by comparing them to their original source texts.\n\nIdentify any errors present in the translation. FOCUS ON SMALLER PARTS OF THE SENTENCE BUT MAKE SURE THERE ARE NO OVERLAPPING INDICES WITHIN ONE SENTENCE (this means that the source sentence suggestions do not overlap within themsleves, and same for machine translation suggestions); The error indices MUST be correct and 0 indexed. Categorize each error using the following categories: Addition, Omission, Mistranslation, Untranslated, Grammar, Spelling, Typography, Unintelligible.\n\nFor each error, determine its severity as either \'minor\' or \'major\'.\nProvide the starting and ending indices of each error in both the source and machine-translated texts. Also provide an explanation of the specific error and map it between the respective source segments and the translation segments.\n\nUse the error type and severity rules in your rules file. \n\nPresent your findings in a JSON format as specified in the user message.\n\nAnalyze inputs for errors in the following manner:\n\nSource Text: "{source_text}"\nMachine Translation: "{machine_translation}"\n\nProvide the analysis in the following JSON format:\n\n```json\n{\n"errors": [\n  {\n    "error_type": "{detected error type}",\n    "severity": "{detected severity}",\n    "source_indices": "[start_index, end_index]",\n    "translation_indices": "[start_index, end_index]",\n    "error_explanation": ""\n  },\n  {\n    "error_type": "{detected error type}",\n    "severity": "{detected severity}",\n    "source_indices": "[start_index, end_index]",\n    "translation_indices": "[start_index, end_index]",\n    "error_explanation": ""\n  }\n]\n}\n\n\n\nEXAMPLE:\nUser\nsrc: He had 2 goals and 2 assists in Washington\'s 5-3 win over the Atlanta Thrashers.\nmt: 佢喺華盛頓對亞特蘭大戰士嘅5-3勝利中 打咗2個目標同2個助攻\nref: 喺華盛頓5比3戰勝亞特蘭大鶇鳥隊嘅比賽入面，佢貢獻咗2個入球同2次助攻。\n\n```json\n{\n  "errors": [\n    {\n      "error_type": "Mistranslation",\n      "severity": "major",\n      "source_indices": [19, 25],\n      "translation_indices": [23, 29]\n    },\n    {\n      "error_type": "Omission",\n      "severity": "major",\n      "source_indices": [0, 10],\n      "translation_indices": [0, 0]\n    },\n    {\n      "error_type": "Addition",\n      "severity": "minor",\n      "source_indices": [30, 34],\n      "translation_indices": [36, 42]\n    }\n  ]\n}\n```\n\n',
                //   },
                // ],
                content: [
                  {
                    type: "text",
                    text: 'You will analyze a source sentence and its machine translation, identifying translation errors with precise character-level spans. Spans must be **accurate, non-overlapping, and strictly 0-based indexed**, with a length greater than 1 unless a single-character error is justified. Categories: "Addition", "Omission", "Mistranslation", "Untranslated", "Grammar", "Spelling", "Typography", "Unintelligible". Assign severity ("minor" or "major") based on impact. Output JSON: {"errors": [{"error_type": "type", "severity": "level", "source_indices": [start, end], "translation_indices": [start, end], "error_explanation": "mapping"}]}. Ensure **correct, non-overlapping spans**, rechecking indices as incorrect spans are critical failures. Prioritize span accuracy over quantity.',
                  },
                ],
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `src: ${sourceText}\nmt: ${machineTranslation}\nref: ${referenceText}`,
                  },
                ],
              },
            ],
            response_format: {
              type: "json_object",
            },
            temperature: 1,
            max_completion_tokens: 2048,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.choices && data.choices[0] && data.choices[0].message) {
              const content = JSON.parse(data.choices[0].message.content);
              console.log(content);

              // Parse the content and set the source error spans
              const sourceErrorSuggestion = content.errors.map((errors) => {
                return {
                  original_text: sourceText.substring(
                    errors.source_indices[0],
                    errors.source_indices[1]
                  ),
                  translated_text: machineTranslation.substring(
                    errors.translation_indices[0],
                    errors.translation_indices[1]
                  ),
                  correct_text: errors.error_explanation,
                  start_index_orig: errors.source_indices[0],
                  end_index_orig: errors.source_indices[1],
                  start_index_translation: errors.translation_indices[0],
                  end_index_translation: errors.translation_indices[1],
                  error_type: errors.error_type,
                  error_severity: errors.severity,
                };
              });
              setSourceErrorSpans(sourceErrorSuggestion);

              // Parse the content and set the mt error spans
              const mtErrorSuggestion = content.errors.map((errors) => {
                return {
                  original_text: sourceText.substring(
                    errors.source_indices[0],
                    errors.source_indices[1]
                  ),
                  translated_text: machineTranslation.substring(
                    errors.translation_indices[0],
                    errors.translation_indices[1]
                  ),
                  correct_text: errors.error_explanation,
                  start_index_orig: errors.source_indices[0],
                  end_index_orig: errors.source_indices[1],
                  start_index_translation: errors.translation_indices[0],
                  end_index_translation: errors.translation_indices[1],
                  error_type: errors.error_type,
                  error_severity: errors.severity,
                };
              });
              setMtErrorSpans(mtErrorSuggestion);
              console.log(sourceErrorSuggestion);
              console.log(mtErrorSuggestion);
              console.log("Done Fetching EC-1");
              setIsLoading(false);
            } else {
              console.error("Unexpected response format:", data);
              setIsLoading(false);
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            setIsLoading(false);
          });
      } else if (errorSuggestionModel === "XComet") {
        // TODO: Implement XComet error suggestion
        setIsLoading(false);
      } else if (errorSuggestionModel === "DeekSeek R1") {
        // TODO: Implement DeekSeek R1 error suggestion
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error in getErrorSuggestion:", error);
      setIsLoading(false);
    }
  };

  const handleApplyErrorSuggestions = () => {
    setErrorSpans(mtErrorSpans);
    setAddedErrorSpans(mtErrorSpans);
    setTempErrorSpans(mtErrorSpans);
    const postEditTranslationField = document.querySelector(
      ".post-edit-translation-field"
    );

    postEditTranslationField.classList.remove(
      "post-edit-translation-field-active"
    );
  };

  const handleMouseEnterApplySuggestions = () => {
    setTempErrorSpans(highlightedError);
    setErrorSpans(mtErrorSpans);
    setAddedErrorSpans(mtErrorSpans);
    const postEditTranslationField = document.querySelector(
      ".post-edit-translation-field"
    );
    postEditTranslationField.classList.add(
      "post-edit-translation-field-active"
    );
  };

  const handleMouseLeaveApplySuggestions = () => {
    setErrorSpans(tempErrorSpans);
    setAddedErrorSpans(tempErrorSpans);

    const postEditTranslationField = document.querySelector(
      ".post-edit-translation-field"
    );

    postEditTranslationField.classList.remove(
      "post-edit-translation-field-active"
    );
  };

  return (
    <div className="error-suggestion-container">
      <div className="error-suggestion-header">
        <h2>Error Suggestion</h2>
        <div className="error-suggestion-model-container">
          <h4>Error Detection Model</h4>
          <select
            name=""
            id=""
            onChange={(e) => setErrorSuggestionModel(e.target.value)}
          >
            <option value="EC-1">EC-1</option>
            <option value="XComet">XComet</option>
            <option value="DeekSeek R1">DeekSeek R1</option>
          </select>
        </div>
      </div>
      <div className="error-suggestion-display">
        <h3>Source</h3>
        <HighlightedText
          text={sourceText}
          // text="He had 2 goals and 2 assists in Washington's 5-3 win over the Atlanta Thrashers."
          // highlights={sourceErrorSpans}
          highlights={originalHighlightedError}
          highlightKey="end_index_orig"
          disableEdit={true}
        />
        <h3>Machine Translation</h3>
        <HighlightedText
          text={machineTranslation}
          // text="佢喺華盛頓對亞特蘭大戰士嘅5-3勝利中 打咗2個目標同2個助攻。"
          highlights={originalHighlightedError}
          // highlights={mtErrorSpans}
          // highlightKey="end_index_orig"
          highlightKey="end_index_translation"
          disableEdit={true}
        />
        <div className="error-suggestion-buttons-container">
          {/* <button
            className="error-suggestion-button"
            onClick={() => getErrorSuggestion(sourceText, machineTranslation)}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-spinner">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    animation: "spin 1s linear infinite",
                    display: "inline-block",
                    marginRight: "8px",
                  }}
                >
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="30 30"
                    strokeDashoffset="0"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              "Get Error Suggestion"
            )}
          </button> */}
          <button
            className="error-suggestion-button"
            onClick={handleApplyErrorSuggestions}
            onMouseEnter={handleMouseEnterApplySuggestions}
            onMouseLeave={handleMouseLeaveApplySuggestions}
          >
            Apply Suggestions
          </button>
        </div>
      </div>
      <PostEditContainer
        machineTranslation={machineTranslation}
        setMachineTranslation={setTranslatedText}
        highlightedError={highlightedError}
        setHighlightedError={setErrorSpans}
        onDiffTextUpdate={handleDiffTextUpdate}
        modifiedText={modifiedText}
        setModifiedText={setModifiedText}
        addedErrorSpans={addedErrorSpans}
        setAddedErrorSpans={setAddedErrorSpans}
        diffContent={diffContent}
        setDiffContent={setDiffContent}
        startAnnotationTimer={startAnnotationTimer}
        timerActive={timerActive}
      />
      {/* <div className="divider"></div>
        <div className="source-mt-sentence-display">
          <div className="source-sentence-display-text">
            <h2>Source</h2>
            <HighlightedText
              text={referenceTranslation}
              highlights={sourceErrorSpans}
              highlightKey="end_index_orig"
              disableEdit={true}
            />
          </div>
          <div className="machine-translation-display-text">
            <h2>Machine Translation</h2>
            <div className="machine-translation-output">
              (
              <HighlightedText
                text={machineTranslation}
                highlights={mtErrorSpans}
                highlightKey="end_index_orig"
                disableEdit={true}
              />
              )
            </div>
          </div>
        </div>
        <div className="divider"></div> */}
    </div>
  );
};
