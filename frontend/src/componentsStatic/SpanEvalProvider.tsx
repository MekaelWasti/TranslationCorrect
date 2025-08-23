import {
  createContext,
  useContext,
  useState,
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
} from "react";
import { v4 as uuid } from "uuid";
import { HighlightedError } from "../types";
import inputJson from "../static/input_sample.json";

export interface QAEntry {
  action: "add" | "modify" | "delete";
  spanId: string;
  span?: SpanWithID;
  originalSpan?: SpanWithID;
  newSpan?: SpanWithID;
  timestamp: Date;
}

type SpanWithID = HighlightedError & { id: string };

type SpanEvalContextType = {
  curEntryIdx: number;
  setEntryIdx: (newEntryIdx: number) => void;
  origText: string;
  setOrigText: Dispatch<SetStateAction<string>>;
  translatedText: string;
  setTranslatedText: Dispatch<SetStateAction<string>>;
  originalSpans: SpanWithID[] | undefined;
  errorSpans: SpanWithID[];
  setErrorSpans: Dispatch<SetStateAction<SpanWithID[]>>;
  updateSpanErrorType: (idx: number, newType: string) => void;
  updateSpanSeverity: (idx: number, newSeverity: string) => void;
  spanSeverity: string;
  setSpanSeverity: Dispatch<SetStateAction<string>>;
  addNewErrorSpan: (
    original_text: string,
    startTextIdx: number,
    endTextIdx: number,
    error_type: string,
    error_severity: string
  ) => void;
  deleteErrorSpan: (idx: number) => void;
  clearErrorSpans: () => void;
  updateSpansPositions: (updatedSpans: SpanWithID[]) => void;
  selectedSpanIdx: number | undefined;
  setSelectedSpanIdx: Dispatch<SetStateAction<number | undefined>>;
  diffContent: React.ReactNode;
  setDiffContent: Dispatch<SetStateAction<React.ReactNode>>;
  spanScores: { [key: number]: string };
  setSpanScores: Dispatch<SetStateAction<{ [key: number]: string }>>;
  // QA Mode & Queue
  qaMode: boolean;
  setQAMode: Dispatch<SetStateAction<boolean>>;
  qaQueue: QAEntry[];
  clearQaQueue: () => void;
  flushQaQueue: () => void;
};

const SpanEvalContext = createContext<SpanEvalContextType | undefined>(
  undefined
);

type SpanEvalProviderProps = {
  children: React.ReactNode;
  onQAAction: (qaEntry: QAEntry) => void;
};

export const SpanEvalProvider = ({
  children,
  onQAAction,
}: SpanEvalProviderProps) => {
  const [curEntryIdx, setCurEntryIdx] = useState<number>(
    Number(localStorage.getItem("curEntryIdx")) || 0
  );
  const input = (inputJson as any).input;

  const [origText, setOrigText] = useState<string>(
    "Please select a sentence to annotate from the database."
  );
  const [translatedText, setTranslatedText] = useState<string>(
    "Please select a sentence to annotate from the database."
  );

  // Spans with stable IDs
  const originalSpans = [] as SpanWithID[];
  const [errorSpans, setErrorSpans] = useState<SpanWithID[]>(() => []);

  // Diff & severity UI state
  const [diffContent, setDiffContent] = useState<React.ReactNode>(
    translatedText
  );
  const [spanSeverity, setSpanSeverity] = useState<string>("");

  // QA mode + coalescing map
  const [qaMode, setQAMode] = useState<boolean>(false);
  const [qaMap, setQaMap] = useState<Map<string, QAEntry>>(() => new Map());

  const enqueueQA = (entry: QAEntry) => {
    setQaMap((prev) => {
      const m = new Map(prev);
      const id = entry.spanId;

      switch (entry.action) {
        case "add":
          m.set(id, { ...entry, action: "add", spanId: id, span: entry.span });
          break;

        case "modify":
          const existing = m.get(id);
          if (existing?.action === "add") {
            // update the "add" to the final version
            m.set(id, {
              action: "add",
              spanId: id,
              span: entry.newSpan!,
              timestamp: entry.timestamp,
            });
          } else {
            // collapse multiple modifies
            const original = existing?.action === "modify"
              ? existing.originalSpan!
              : entry.originalSpan!;
            m.set(id, {
              action: "modify",
              spanId: id,
              originalSpan: original,
              newSpan: entry.newSpan!,
              timestamp: entry.timestamp,
            });
          }
          break;

        case "delete":
          const prevEntry = m.get(id);
          if (prevEntry?.action === "add") {
            // added then deleted -> drop entirely
            m.delete(id);
          } else {
            // mark deletion
            m.set(id, {
              action: "delete",
              spanId: id,
              originalSpan: entry.originalSpan,
              timestamp: entry.timestamp,
            });
          }
          break;
      }
      return m;
    });
  };

  const clearQaQueue = () => {
    setQaMap(new Map());
  };

  const flushQaQueue = () => {
    const entries = Array.from(qaMap.values());
    clearQaQueue();
    entries.forEach((e) => onQAAction(e));
  };

  // expose as an array for UI/debug if needed
  const qaQueue = useMemo(() => Array.from(qaMap.values()), [qaMap]);

  // Entry switching (assign IDs on load)
  const setEntryIdx = (newEntryIdx: number) => {
    if (newEntryIdx >= input.length) return;
    setCurEntryIdx(newEntryIdx);
    const entry = input[newEntryIdx];
    setOrigText(entry.original_text);
    setTranslatedText(entry.translated_text);
    setDiffContent(entry.translated_text);
    // give each loaded span a unique ID
    const loadedSpans: SpanWithID[] = (entry.errorSpans || []).map((s: HighlightedError) => ({
      ...s,
      id: uuid(),
    }));
    setErrorSpans(loadedSpans);
    localStorage.setItem("curEntryIdx", `${newEntryIdx}`);
  };

  // Modify span type
  const updateSpanErrorType = (idx: number, newType: string) => {
    const old = errorSpans[idx];
    const updated: SpanWithID = { ...old, error_type: newType };
    setErrorSpans([
      ...errorSpans.slice(0, idx),
      updated,
      ...errorSpans.slice(idx + 1),
    ]);
    if (qaMode) {
      enqueueQA({
        action: "modify",
        spanId: old.id,
        originalSpan: old,
        newSpan: updated,
        timestamp: new Date(),
      });
    }
  };

  // Modify span severity
  const updateSpanSeverity = (idx: number, newSeverity: string) => {
    const old = errorSpans[idx];
    const updated: SpanWithID = { ...old, error_severity: newSeverity };
    setErrorSpans([
      ...errorSpans.slice(0, idx),
      updated,
      ...errorSpans.slice(idx + 1),
    ]);
    if (qaMode) {
      enqueueQA({
        action: "modify",
        spanId: old.id,
        originalSpan: old,
        newSpan: updated,
        timestamp: new Date(),
      });
    }
  };

  // Add a new span
  const addNewErrorSpan = (
    original_text: string,
    startTextIdx: number,
    endTextIdx: number,
    error_type: string,
    error_severity: string
  ) => {
    const newErrorSpan: SpanWithID = {
      original_text,
      start_index_translation: startTextIdx,
      end_index_translation: endTextIdx,
      error_type,
      error_severity,
      id: uuid(),
    };
    setErrorSpans((s) => [...s, newErrorSpan]);
    if (qaMode) {
      enqueueQA({
        action: "add",
        spanId: newErrorSpan.id,
        span: newErrorSpan,
        timestamp: new Date(),
      });
    }
  };

  // Delete a span
  const deleteErrorSpan = (idx: number) => {
    const spanToDelete = errorSpans[idx];
    setErrorSpans((s) => [...s.slice(0, idx), ...s.slice(idx + 1)]);
    if (qaMode) {
      enqueueQA({
        action: "delete",
        spanId: spanToDelete.id,
        originalSpan: spanToDelete,
        timestamp: new Date(),
      });
    }
  };

  const clearErrorSpans = () => {
    if (qaMode && errorSpans.length > 0) {
      // Enqueue delete actions for all spans being cleared
      errorSpans.forEach((span) => {
        enqueueQA({
          action: "delete",
          spanId: span.id,
          originalSpan: span,
          timestamp: new Date(),
        });
      });
    }
    setErrorSpans([]);
  };

  // Update spans with position adjustments (for text editing)
  const updateSpansPositions = (updatedSpans: SpanWithID[]) => {
    if (qaMode) {
      // Compare old and new spans to detect position changes
      const oldSpansMap = new Map(errorSpans.map(span => [span.id, span]));
      
      updatedSpans.forEach((newSpan) => {
        const oldSpan = oldSpansMap.get(newSpan.id);
        if (oldSpan && (
          oldSpan.start_index_translation !== newSpan.start_index_translation ||
          oldSpan.end_index_translation !== newSpan.end_index_translation
        )) {
          enqueueQA({
            action: "modify",
            spanId: newSpan.id,
            originalSpan: oldSpan,
            newSpan: newSpan,
            timestamp: new Date(),
          });
        }
      });
    }
    setErrorSpans(updatedSpans);
  };

  // Selected span & scores
  const [selectedSpanIdx, setSelectedSpanIdx] = useState<number | undefined>(
    undefined
  );
  const [spanScores, setSpanScores] = useState<{ [key: number]: string }>({});
  useEffect(() => setSpanScores(spanScores), [spanScores]);

  // Context value
  const contextValue: SpanEvalContextType = {
    curEntryIdx,
    setEntryIdx,
    origText,
    setOrigText,
    translatedText,
    setTranslatedText,
    originalSpans,
    errorSpans,
    setErrorSpans,
    updateSpanErrorType,
    updateSpanSeverity,
    spanSeverity,
    setSpanSeverity,
    addNewErrorSpan,
    deleteErrorSpan,
    clearErrorSpans,
    updateSpansPositions,
    selectedSpanIdx,
    setSelectedSpanIdx,
    diffContent,
    setDiffContent,
    spanScores,
    setSpanScores,
    qaMode,
    setQAMode,
    qaQueue,
    clearQaQueue,
    flushQaQueue,
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
    throw new Error(
      "Tried to consume SpanEvalContext without a provider"
    );
  }
  return value;
};
