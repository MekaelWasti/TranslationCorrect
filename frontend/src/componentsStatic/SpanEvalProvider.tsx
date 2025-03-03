import {
  createContext,
  useContext,
  useState,
  Dispatch,
  SetStateAction,
  useEffect,
} from "react";

import { HighlightedError } from "../types";
// import inputJson from "../static/input_sample.json";
// import inputJson from "../static/input.json";
import inputJson from "../static/input_sample.json";

// Provides context to components responsible for evaluating / editing translations.
// Currently only stores selected span index and span scores. Down the road, the provider can be used to track all evaluation/edit status.

type SpanEvalContextType = {
  curEntryIdx: number;
  setEntryIdx: (newEntryIdx: number) => void;
  origText: string;
  setOrigText: Dispatch<SetStateAction<string>>;
  translatedText: string;
  setTranslatedText: Dispatch<SetStateAction<string>>;
  originalSpans: HighlightedError[] | undefined;
  errorSpans: HighlightedError[] | undefined;
  setErrorSpans: Dispatch<SetStateAction<HighlightedError[]>>;
  updateSpanErrorType: (idx: number, newType: string) => void;
  updateSpanSeverity: (idx: number, newSeverity: string) => void;
  spanSeverity: string;
  setSpanSeverity: Dispatch<SetStateAction<string>>;
  addNewErrorSpan: (
    original_text: string,
    startTextIdx: number,
    endTextIdx: number,
    error_type: string,
    severity: string
  ) => void;
  selectedSpanIdx: number | undefined;
  setSelectedSpanIdx: Dispatch<SetStateAction<number | undefined>>;
  diffContent: React.ReactNode;
  setDiffContent: Dispatch<SetStateAction<React.ReactNode>>;
  // spanScores: { [key: number]: number };
  // setSpanScores:
  // | Dispatch<SetStateAction<{ [key: number]: number }>>
  // | undefined;
  spanScores: { [key: number]: string };
  setSpanScores:
    | Dispatch<SetStateAction<{ [key: number]: string }>>
    | undefined;
};

const SpanEvalContext = createContext<SpanEvalContextType | undefined>(
  undefined
);

type SpanEvalProviderProps = { children: React.ReactNode };

export const SpanEvalProvider = ({ children }: SpanEvalProviderProps) => {
  const [curEntryIdx, setCurEntryIdx] = useState<number>(
    Number(localStorage.getItem("curEntryIdx")) || 0
  );
  const input = inputJson.input;

  // const origText = input[curEntryIdx].original_text;
  const [origText, setOrigText] = useState<string>(
    // input[curEntryIdx].original_text
    "Please select a sentence to annotate from the database." // Want empty string for original text
  );
  const [translatedText, setTranslatedText] = useState<string>(
    // input[curEntryIdx].translated_text
    "Please select a sentence to annotate from the database." // Want empty string for translated text
  );
  // const originalSpans = input[curEntryIdx].errorSpans;
  const originalSpans = []; // Want empty array for spans
  const [errorSpans, setErrorSpans] = useState<HighlightedError[]>(
    // input[curEntryIdx].errorSpans
    []
  );
  const [diffContent, setDiffContent] =
    useState<React.ReactNode>(translatedText);

  const [error_type, setError_type] = useState<string>("");

  const [spanSeverity, setSpanSeverity] = useState<string>("");

  const setEntryIdx = (newEntryIdx: number) => {
    if (newEntryIdx >= input.length) {
      return;
    }
    setCurEntryIdx(newEntryIdx);
    setOrigText(input[newEntryIdx].original_text);
    setTranslatedText(input[newEntryIdx].translated_text);
    setErrorSpans(input[newEntryIdx].errorSpans);
    setDiffContent(input[newEntryIdx].translated_text);
    localStorage.setItem("curEntryIdx", `${newEntryIdx}`);
  };
  const updateSpanErrorType = (idx: number, newType: string) => {
    const newErrorSpan = { ...errorSpans[idx], error_type: newType };
    const newErrorSpans = [
      ...errorSpans.slice(0, idx),
      newErrorSpan,
      ...errorSpans.slice(idx + 1, errorSpans.length),
    ];

    setErrorSpans(newErrorSpans);
  };

  const updateSpanSeverity = (idx: number, newSeverity: string) => {
    const newErrorSpan = { ...errorSpans[idx], error_severity: newSeverity };
    const newErrorSpans = [
      ...errorSpans.slice(0, idx),
      newErrorSpan,
      ...errorSpans.slice(idx + 1, errorSpans.length),
    ];

    setErrorSpans(newErrorSpans);
  };
  const addNewErrorSpan = (
    original_text: string,
    startTextIdx: number,
    endTextIdx: number,
    error_type: string,
    error_severity: string
  ) => {
    const newErrorSpans = [
      ...errorSpans,
      {
        original_text: original_text,
        start_index_translation: startTextIdx,
        end_index_translation: endTextIdx,
        error_type: error_type,
        error_severity: error_severity,
      } as HighlightedError,
    ];
    setErrorSpans(newErrorSpans);
  };

  const [selectedSpanIdx, setSelectedSpanIdx] = useState<number>();
  const [spanScores, setSpanScores] = useState<{
    // [key: number]: number;
    [key: number]: string; //Change to Minor / Major selection
  }>({}); // span idx: score

  useEffect(() => {
    setSpanScores(spanScores);
  }, [spanScores]);

  const contextValue = {
    origText,
    curEntryIdx,
    setEntryIdx,
    setOrigText,
    translatedText,
    setTranslatedText,
    originalSpans,
    errorSpans,
    setErrorSpans,
    updateSpanErrorType,
    spanSeverity,
    setSpanSeverity,
    updateSpanSeverity,
    addNewErrorSpan,
    diffContent,
    setDiffContent,
    selectedSpanIdx,
    setSelectedSpanIdx,
    spanScores,
    setSpanScores,
    error_type,
  };

  return (
    <SpanEvalContext.Provider value={contextValue}>
      {children}
    </SpanEvalContext.Provider>
  );
};

export const useSpanEvalContext = () => {
  const value = useContext(SpanEvalContext);

  if (!value) {
    throw new Error("Tried to consume SpanEvalContext without a provider");
  }

  return value;
};
