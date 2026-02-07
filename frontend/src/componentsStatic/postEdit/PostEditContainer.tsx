import {
  DIFF_DELETE,
  DIFF_INSERT,
  DIFF_EQUAL,
  diff_match_patch,
} from "diff-match-patch";
import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import "../../index.css";
import { useSpanEvalContext } from "../SpanEvalProvider";
import { SpanScoreDropdown } from "../scoring/SpanScoreDropdown";
import { BaseEditor, createEditor, Descendant, Editor, Node as SlateNode, Range, Text, Transforms } from "slate";
import { Slate, Editable, ReactEditor, RenderLeafProps, withReact } from "slate-react";
import { HistoryEditor, withHistory } from "slate-history";
import { HighlightedError, colorMappings } from "../../types";

type CustomText = {
  text: string;
  isHighlight?: boolean;
  highlight?: HighlightedError;
  highlightIndex?: number;
};

type ParagraphElement = {
  type: "paragraph";
  children: CustomText[];
};

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: ParagraphElement;
    Text: CustomText;
  }
}

type PostEditContainerProps = {
  currentMode?: "Annotation Mode" | "QA Mode" | "QA Comparison";
  machineTranslation: string;
  setMachineTranslation: (newTranslation: string) => void;
  onDiffTextUpdate: (newDiffText: React.ReactNode) => void;
  modifiedText: string;
  setModifiedText: (newText: string) => void;
  diffContent: React.ReactNode;
  setDiffContent: (newDiffContent: React.ReactNode) => void;
};

// Originally inside component, extracted it out
export const generateDiff = (original: string, modified: string, setModifiedText: (newText: string) => void, setDiffContent: (newDiffContent: React.ReactNode) => void) => {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(original, modified);
  dmp.diff_cleanupSemantic(diffs);

  // Send raw modified text to parent component
  setModifiedText(modified);

  // Convert diffs into React elements
  const diffElements = diffs.map(([type, text], index) => {
    if (type === DIFF_INSERT) {
      return (
        <span className="post-edit-additions" key={`diff-${index}`}>
          {text}
        </span>
      );
    } else if (type === DIFF_DELETE) {
      return (
        <span className="post-edit-deletions" key={`diff-${index}`}>
          {text}
        </span>
      );
    } else {
      // For equal text, return as is
      return text;
    }
  });

  // Convert array of elements to a single React element
  const diffContent = <>{diffElements}</>;

  // Update state and pass the diffContent to parent component
  setDiffContent(diffContent);
};

// **PostEditContainer Component**
export const PostEditContainer: React.FC<PostEditContainerProps> = ({
  machineTranslation,
  onDiffTextUpdate,
  modifiedText,
  setModifiedText,
  setDiffContent,
  currentMode,
}) => {
  const editor = useMemo(() => withHistory(withReact(createEditor() as ReactEditor)), []);
  const editableDivRef = useRef<HTMLDivElement>(null);
  const isInternalEditRef = useRef(false); // Track if current change is from user edit
  const lastEmittedText = useRef<string | null>(null); // Track last text emitted to parent to prevent echo loops
  const lastEmittedSpans = useRef<HighlightedError[] | null>(null); // Track last spans emitted to parent
  const updateTimeoutRef = useRef<number | null>(null); // Debounce timeout for span updates
  const { addNewErrorSpan, deleteErrorSpan, clearErrorSpans, errorSpans, setErrorSpans, updateSpanErrorType, updateSpanSeverity, setSpanSeverity } = useSpanEvalContext();
  
  // Local optimistic state for spans to ensure synchronous updates with text editing
  const [internalSpans, setInternalSpans] = useState<HighlightedError[]>(errorSpans || []);

  // Ref to hold the synchronous state of text and spans to handle rapid updates avoiding race conditions
  const syncStateRef = useRef<{ text: string; spans: HighlightedError[] }>({
    text: modifiedText,
    spans: errorSpans || [],
  });
  
  // Sync the ref when props change (only if not an internal edit to avoid overwriting pending state)
  useEffect(() => {
    if (!isInternalEditRef.current) {
        syncStateRef.current = {
            text: modifiedText,
            spans: errorSpans || []
        };
    }
  }, [modifiedText, errorSpans]);

  const [value, setValue] = useState<Descendant[]>([
    {
      type: "paragraph",
      children: [{ text: modifiedText || "" }],
    },
  ]);

  const [showInsertButton, setShowInsertButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [highlightInserted, setHighlightInserted] = useState(false);

  // Add state for clear button
  const [clearButtonClicked, setClearButtonClicked] = useState(false);

  // Hover / tooltip / dropdown state (moved from HighlightedText)
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hoveredHighlight, setHoveredHighlight] = useState<HighlightedError | null>(null);
  const [hoveredHighlightIdx, setHoveredHighlightIdx] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [deleteButtonVisible, setDeleteButtonVisible] = useState(false);
  const [deleteButtonStyle, setDeleteButtonStyle] = useState<{ top: number; left: number; width?: number }>({
    top: 0,
    left: 0,
  });
  const [selectedHighlightIdx, setSelectedHighlightIdx] = useState<number | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<string>("");
  const [spanDropdown, setSpanDropdown] = useState(false);
  const [dropdownAnimation, setDropdownAnimation] = useState<string>("");
  const [spanPosition, setSpanPosition] = useState<{ top: number; left: number } | null>(null);
  const [initialSpanPosition, setInitialSpanPosition] = useState<{ top: number; left: number } | null>(null);

  const updateSpansForTextChange = useCallback(
    (newText: string) => {
      // Use Slate operations to update spans instead of diff-match-patch
      // This is more reliable for preserving cursor position relative to spans
      
      const currentSpans = syncStateRef.current.spans;
      // We process operations from the editor to determine exact shifts
      let updatedSpans = [...currentSpans];
      
      // We assume mostly single text node at [0, 0] or linear text.
      // Since `editor.operations` reflects the change that JUST happened.
      
      editor.operations.forEach((op) => {
        if (op.type === "insert_text") {
             const opOffset = op.offset; 
             // Only process if it's a text op on our content
             if (op.path.length > 0) {
                 const insertLength = op.text.length;
                 updatedSpans = updatedSpans.map((span) => {
                    let { start_index_translation: s, end_index_translation: e } = span;
                    
                    // Insert before span? Shift both.
                    if (opOffset <= s) {
                        s += insertLength;
                        e += insertLength;
                    }
                    // Insert inside span? Shift end.
                    // We use <= e to allow 'sticky' extension at the end of the span,
                    // which fixes the issue of subsequent characters being 'thrown out'.
                    else if (opOffset <= e) {
                         e += insertLength;
                    }
                    
                    return { ...span, start_index_translation: s, end_index_translation: e };
                 });
             }
        } else if (op.type === "remove_text") {
             const opOffset = op.offset;
             if (op.path.length > 0) {
                 const deleteLength = op.text.length;
                 const changeS = opOffset;
                 const changeE = opOffset + deleteLength;
                 
                 updatedSpans = updatedSpans.map((span) => {
                    let { start_index_translation: s, end_index_translation: e } = span;
                    
                    // Helper to map a point against a deletion range
                    const mapPoint = (p: number) => {
                        if (p <= changeS) return p;
                        if (p >= changeE) return p - deleteLength;
                        return changeS; // Snap to start of deletion
                    };
                    
                    return { ...span, start_index_translation: mapPoint(s), end_index_translation: mapPoint(e) };
                 });
             }
        }
      });
      
      // Fallback: If no ops processed (e.g. paste or replace), maybe use DMP?
      // But for typing, ops should exist. 
      // Filter out empty spans?
      updatedSpans = updatedSpans.filter(s => s.start_index_translation < s.end_index_translation);

      // Update span text content to match the edited text
      updatedSpans = updatedSpans.map((span) => ({
        ...span,
        original_text: newText.substring(span.start_index_translation, span.end_index_translation)
      }));

      // Update synchronous ref immediately for the NEXT character typed
      syncStateRef.current = {
        text: newText,
        spans: updatedSpans
      };

      setInternalSpans(updatedSpans);
      setErrorSpans(updatedSpans);
      setModifiedText(newText);
      lastEmittedText.current = newText;
      lastEmittedSpans.current = updatedSpans;
      // generateDiff calls setModifiedText internally, but we've already updated the spans and text state.
      // We call it here to generate the visual diff elements for the UI.
      generateDiff(machineTranslation, newText, () => {}, onDiffTextUpdate);
    },
    [
      editor, // changes in editor ref are rare but operation access needs it
      machineTranslation,
      onDiffTextUpdate,
      setErrorSpans,
      setModifiedText, 
    ]
  );


  const handleEditorChange = useCallback(
    (nextValue: Descendant[]) => {
      setValue(nextValue);
      const newText = Editor.string(editor, []);
      if (newText !== modifiedText) {
        isInternalEditRef.current = true;
        updateSpansForTextChange(newText);
        // Reset the flag after a meaningful delay to ensure the parent update / effect cycle completes.
        // 500ms should be enough to cover slow React render cycles or async prop updates
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = window.setTimeout(() => {
          isInternalEditRef.current = false;
        }, 500);
      }
    },
    [editor, modifiedText, updateSpansForTextChange]
  );

  const applyHighlight = () => {
    setHighlightInserted(true);
    const selection = editor.selection;
    if (!selection || Range.isCollapsed(selection)) return;

    const [startPoint, endPoint] = Range.edges(selection);
    const start = Math.min(startPoint.offset, endPoint.offset);
    const end = Math.max(startPoint.offset, endPoint.offset);
    const selectedText = Editor.string(editor, selection);
    if (!selectedText.trim()) return;

    const original_text = selectedText;
    console.log("Span recorded:", {
      text: original_text,
      start,
      end,
      length: end - start,
    });
    addNewErrorSpan(
      original_text,
      start,
      end,
      "Addition",
      "Minor"
    );
  };

  const handleClearSpansButton = () => {
    if (clearButtonClicked) {
      clearErrorSpans();
      setModifiedText(machineTranslation);
      setDiffContent(machineTranslation);
      setValue([
        {
          type: "paragraph",
          children: [{ text: machineTranslation || "" }],
        },
      ]);
      setClearButtonClicked(false);
    } else {
      setClearButtonClicked(true);
      setTimeout(() => setClearButtonClicked(false), 3000);
    }
  };

  // Reset highlightInserted after dropdown has opened
  useEffect(() => {
    if (spanDropdown && highlightInserted) {
      setHighlightInserted(false);
    }
  }, [spanDropdown, highlightInserted]);

  const handleEditorMouseUp = () => {
    const selection = editor.selection;
    if (selection && Range.isExpanded(selection)) {
      try {
        const domRange = ReactEditor.toDOMRange(editor, selection);
        const rect = domRange.getBoundingClientRect();
        setShowInsertButton(true);
        setButtonPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX + rect.width / 2,
        });
      } catch {
        setShowInsertButton(false);
      }
    } else {
      setShowInsertButton(false);
    }
  };

  const handleInsertSpanClick = () => {
    applyHighlight();
    setShowInsertButton(false);
    window.getSelection()?.removeAllRanges();
  };

  const textOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    let offset = 0;
    for (const [node, path] of SlateNode.texts(editor)) {
      offsets.set(path.join(","), offset);
      offset += node.text.length;
    }
    return offsets;
  }, [editor, value]);

  const decorate = useCallback(
    ([node, path]: any) => {
      const ranges: Range[] = [];
      if (!Text.isText(node)) return ranges;

      const nodeStart = textOffsets.get(path.join(",")) ?? 0;
      const nodeEnd = nodeStart + node.text.length;

      // Use syncStateRef to get the most up-to-date spans immediately during typing
      // falling back to internalSpans if ref is somehow out of sync (rare)
      const currentSpans = syncStateRef.current.spans || internalSpans;

      currentSpans.forEach((span, idx) => {
        const start = span.start_index_translation;
        const end = span.end_index_translation;
        if (end <= nodeStart || start >= nodeEnd || start === end) return;

        const rangeStart = Math.max(start, nodeStart) - nodeStart;
        const rangeEnd = Math.min(end, nodeEnd) - nodeStart;
        ranges.push({
          anchor: { path, offset: rangeStart },
          focus: { path, offset: rangeEnd },
          isHighlight: true,
          highlight: span,
          highlightIndex: idx,
        } as Range);
      });

      return ranges;
    },
    [internalSpans, textOffsets] // We depend on internalSpans to trigger updates, but read from ref for data
  );

  const handleMouseEnterSpan = (
    e: React.MouseEvent<HTMLSpanElement>,
    highlight: HighlightedError,
    highlightIdx: number
  ) => {
    if (!spanDropdown) {
      setHoveredHighlight(highlight);
      setHoveredHighlightIdx(highlightIdx);
      setDeleteButtonVisible(true);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const spanWidth = rect.width;
    const deleteButtonWidth = Math.max(spanWidth / 3, 30);

    setDeleteButtonStyle({
      top: rect.top + window.scrollY - 30,
      left: rect.left + window.scrollX + spanWidth / 2 - deleteButtonWidth / 2,
      width: deleteButtonWidth,
    });

    setSpanPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (hoveredHighlight || spanDropdown) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
    setTooltipStyle({
      top: e.pageY + 25,
      left: e.pageX - 125,
    });
  };

  const handleMouseLeaveSpan = () => {
    setTimeout(() => {
      if (
        !document.querySelector(".delete-span-button:hover") &&
        !document.querySelector(".highlight:hover")
      ) {
        setHoveredHighlight(null);
        setHoveredHighlightIdx(null);
        setDeleteButtonVisible(false);
      }
    }, 100);
  };

  const handleMouseClick = (
    e: React.MouseEvent<HTMLSpanElement>,
    highlight: HighlightedError,
    highlightIdx: number
  ) => {
    if (e.button === 0) {
      setSelectedSpan(highlight.error_type);
      setHoveredHighlight(highlight);
      setSelectedHighlightIdx(highlightIdx);
      setSpanSeverity(highlight.error_severity);

      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const newPosition = {
        top: rect.top + window.scrollY,
        left: centerX + window.scrollX - 75,
      };
      setSpanPosition(newPosition);
      setInitialSpanPosition(newPosition);
      return;
    }

    e.stopPropagation();
    if (highlight.error_type === selectedSpan && spanDropdown) {
      setDropdownAnimation("fade-out");
      setTimeout(() => {
        setSpanDropdown(false);
        setDropdownAnimation("");
      }, 250);
    } else {
      setSelectedSpan(highlight.error_type);
      setSpanSeverity(highlight.error_severity);
      setSpanDropdown(true);
      setSelectedHighlightIdx(highlightIdx);

      requestAnimationFrame(() => {
        setDropdownAnimation("fade-in");
      });

      setHoveredHighlight(highlight);
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dropdownPos = {
        top: rect.bottom + window.scrollY + 10,
        left: centerX + window.scrollX - 75,
      };
      setSpanPosition(dropdownPos);
      setInitialSpanPosition(dropdownPos);
    }
  };

  const handleDeleteSpan = (
    e: React.MouseEvent<HTMLButtonElement>,
    idx: number
  ) => {
    e.stopPropagation();
    const button = e.currentTarget;
    button.style.transform = "scale(0.9)";
    button.style.opacity = "0.8";
    setTimeout(() => {
      deleteErrorSpan(idx);
      setDeleteButtonVisible(false);
      setHoveredHighlight(null);
      setHoveredHighlightIdx(null);
    }, 0);
  };

  const handleTypeSelect = (type: string) => {
    if (selectedHighlightIdx === null) return;
    updateSpanErrorType(selectedHighlightIdx, type);
    setDropdownAnimation("fade-out");
    setTimeout(() => {
      setSpanDropdown(false);
      setDropdownAnimation("");
    }, 250);
  };

  const renderLeaf = useCallback(
    ({ attributes, children, leaf }: RenderLeafProps) => {
      if (!leaf.isHighlight) {
        return <span {...attributes}>{children}</span>;
      }

      return (
        <span
          {...attributes}
          className={`highlight ${
            selectedHighlightIdx === leaf.highlightIndex ? "highlight-selected" : ""
          }`}
          style={{
            backgroundColor: colorMappings[leaf.highlight.error_type],
          }}
          data-highlight-index={leaf.highlightIndex}
          onMouseEnter={(e) =>
            handleMouseEnterSpan(e, leaf.highlight, leaf.highlightIndex)
          }
          onMouseLeave={handleMouseLeaveSpan}
          onMouseMove={handleMouseMove}
          onMouseDown={(e) => handleMouseClick(e, leaf.highlight, leaf.highlightIndex)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {children}
        </span>
      );
    },
    [handleMouseClick, handleMouseEnterSpan, handleMouseLeaveSpan, handleMouseMove, selectedHighlightIdx]
  );

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as globalThis.Node) &&
        spanDropdown
      ) {
        setDropdownAnimation("fade-out");
        setTimeout(() => {
          setSpanDropdown(false);
          setDropdownAnimation("");
        }, 250);
      }
    };
    document.addEventListener("mousedown", handleClickOutside as EventListener);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [spanDropdown]);

  useEffect(() => {
    const onDocClick = (ev: globalThis.MouseEvent) => {
      if (!(ev.target as HTMLElement).closest(".highlight, .delete-span-button")) {
        setHoveredHighlight(null);
        setHoveredHighlightIdx(null);
        setDeleteButtonVisible(false);
      }
    };
    document.addEventListener("mousedown", onDocClick as EventListener);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
    };
  }, []);

  useEffect(() => {
    if (highlightInserted && errorSpans.length > 0 && !spanDropdown) {
      const lastHighlightIdx = errorSpans.length - 1;
      setSelectedHighlightIdx(lastHighlightIdx);
      
      // Retry finding the element with backoff in case DOM hasn't updated yet
      let attempts = 0;
      const maxAttempts = 5;
      const retryInterval = 50;
      
      const tryOpenDropdown = () => {
        const targetElem = document.querySelector(
          `.highlight[data-highlight-index="${lastHighlightIdx}"]`
        ) as HTMLElement | null;

        if (targetElem) {
          const rect = targetElem.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const newPosition = {
            top: rect.bottom + window.scrollY + 10,
            left: centerX + window.scrollX - 75,
          };
          setSpanPosition(newPosition);
          setInitialSpanPosition(newPosition);
          setSpanDropdown(true);
          requestAnimationFrame(() => {
            setDropdownAnimation("fade-in");
          });
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(tryOpenDropdown, retryInterval);
        }
      };
      
      tryOpenDropdown();
    }
  }, [errorSpans.length, highlightInserted, spanDropdown]);

  // const generateDiff = (original: string, modified: string) => {
  //   const dmp = new diff_match_patch();
  //   const diffs = dmp.diff_main(original, modified);
  //   dmp.diff_cleanupSemantic(diffs);

  //   // Send raw modified text to parent component
  //   setModifiedText(modified);

  //   // Convert diffs into React elements
  //   const diffElements = diffs.map(([type, text], index) => {
  //     if (type === DIFF_INSERT) {
  //       return (
  //         <span className="post-edit-additions" key={`diff-${index}`}>
  //           {text}
  //         </span>
  //       );
  //     } else if (type === DIFF_DELETE) {
  //       return (
  //         <span className="post-edit-deletions" key={`diff-${index}`}>
  //           {text}
  //         </span>
  //       );
  //     } else {
  //       // For equal text, return as is
  //       return text;
  //     }
  //   });

  //   // Convert array of elements to a single React element
  //   const diffContent = <>{diffElements}</>;

  //   // Update state and pass the diffContent to parent component
  //   onDiffTextUpdate(diffContent);
  // };

  useEffect(() => {
    // 1. Handle Text Sync
    // Only sync external modifiedText changes into the editor if this wasn't from a user edit
    // Use lastEmittedText to ignore updates that are just echoes of our own changes
    // If we are currently editing (isInternalEditRef), we generally ignore external updates 
    // UNLESS they are significantly different (not just an echo).
    // But detecting "significantly different" is hard. 
    // We rely on lastEmittedText to filter echoes.
    
    let textSynced = false;
    let shouldSyncText = false;
    
    if (modifiedText !== lastEmittedText.current) {
        // External text is different from what we last sent.
        // It could be a genuine external update, or an echo we missed?
        // If we are editing, we are skeptical. 
        if (!isInternalEditRef.current) {
            shouldSyncText = true;
        } else {
             // If we are editing, but the prop changed to something we didn't send?
             // It might be an external overwrite. We probably should accept it?
             // Or it's a conflict. "Last writer wins" usually means local wins in editor.
             // We stick to local if editing.
             shouldSyncText = false;
        }
    }

    if (shouldSyncText) {
        const currentText = Editor.string(editor, []);
        if (modifiedText !== currentText) {
          const nextValue: Descendant[] = [
            {
              type: "paragraph",
              children: [{ text: modifiedText || "" }],
            },
          ];
          editor.children = nextValue;
          Editor.normalize(editor, { force: true });
          setValue(nextValue);
          // Reset lastEmittedText since we just accepted an external change
          lastEmittedText.current = modifiedText;
          textSynced = true;
        }
    }
      
    // 2. Handle Span Sync
    // Also sync internal spans if available.
    // Logic: Sync if text synced OR if spans changed externally and we aren't editing.
    // To filter span echoes, we would check lastEmittedSpans, but deep comparison is expensive.
    // Instead we rely on reference equality + isInternalEditRef.
    
    const spansChanged = errorSpans !== internalSpans;
    const isSpanEcho = errorSpans === lastEmittedSpans.current; 
    
    if (errorSpans && spansChanged) {
        if (textSynced) {
             // If text reset, we MUST reset spans to match
             setInternalSpans(errorSpans);
             syncStateRef.current = { text: modifiedText, spans: errorSpans };
        } else if (!isInternalEditRef.current && !isSpanEcho) {
             // Not editing, and not an echo -> External update (e.g. deletion from sidebar)
             setInternalSpans(errorSpans);
             syncStateRef.current = { text: modifiedText, spans: errorSpans };
        }
    }
  }, [editor, modifiedText, errorSpans, internalSpans]);

  //   Return JSX
  return (
    <div>
      <div className="post-edit-section">
        <div className="post-edit-section-header">
          <h3>Post-Editing</h3>
        </div>
        {currentMode !== "QA Comparison" && (
          <div className="post-edit-section-header-buttons">
            <button className="start-annotation-button">Start Annotation</button>
            <button className="insert-span-button" onClick={applyHighlight}>
              Insert Span
            </button>
            {/* <button className="custom-correction-button">Custom Correction</button> */}
            <SpanScoreDropdown />
            <button
              className={`clear-spans-button ${
                clearButtonClicked ? "clear-spans-button-confirm" : ""
              }`}
              onClick={handleClearSpansButton}
            >
              {clearButtonClicked ? "Clear?" : "Clear"}
            </button>
          </div>
        )}
        <div className="post-edit-translation-field" ref={editableDivRef}>
          <Slate editor={editor} initialValue={value} onChange={handleEditorChange}>
            <Editable
              onMouseUp={handleEditorMouseUp}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain").replace(/\n/g, " ");
                editor.insertText(text);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}
              renderLeaf={renderLeaf}
              decorate={decorate}
              suppressContentEditableWarning
            />
          </Slate>
        </div>
        <button
          className={`insert-span-popup-button ${
            showInsertButton ? "visible" : ""
          }`}
          style={{
            position: "absolute",
            top: buttonPosition.top + 20,
            left: `calc(${buttonPosition.left}px - 43px)`,
          }}
          onClick={applyHighlight}
        >
          +
        </button>
      </div>

      {/* Tooltip */}
      {hoveredHighlight && mousePosition && (
        <div className="error-tooltip" style={tooltipStyle}>
          <h3 style={{ color: colorMappings[hoveredHighlight.error_type] }}>
            Error Type: {hoveredHighlight.error_type}
          </h3>
          <div className="error-tooltip-text-display">
            <p
              style={{
                color:
                  hoveredHighlight.error_severity === "Minor"
                    ? "#ffd000"
                    : hoveredHighlight.error_severity === "Major"
                    ? "orange"
                    : "red",
              }}
            >
              <strong style={{ color: "white" }}>Error Severity:</strong>{" "}
              {hoveredHighlight.error_severity}
            </p>
            {hoveredHighlight.error_confidence && (
              <p>
                <strong>Error Confidence:</strong>{" "}
                {hoveredHighlight.error_confidence}
              </p>
            )}
            <p>
              <strong>Original Text:</strong> {hoveredHighlight.original_text}
            </p>
            {hoveredHighlight.translated_text && (
              <p>
                <strong>Translated Text:</strong>{" "}
                {hoveredHighlight.translated_text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delete button */}
      {deleteButtonVisible && hoveredHighlightIdx !== null && (
        <button
          className="delete-span-button visible"
          style={deleteButtonStyle}
          onClick={(e) => handleDeleteSpan(e, hoveredHighlightIdx)}
          onMouseEnter={() => setDeleteButtonVisible(true)}
          onMouseLeave={handleMouseLeaveSpan}
          onKeyDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onKeyPress={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          X
        </button>
      )}

      {/* Change error type dropdown */}
      {spanDropdown && (
        <div
          ref={dropdownRef}
          className={`span-dropdown ${dropdownAnimation}`}
          onContextMenu={(event) => event.preventDefault()}
          contentEditable={false}
          onKeyDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onKeyPress={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          style={{
            position: "absolute",
            left: initialSpanPosition?.left ?? spanPosition?.left,
            top: initialSpanPosition?.top ?? spanPosition?.top,
            zIndex: 1000,
          }}
        >
          <ul>
            {Object.keys(colorMappings).map((error_type) => (
              <div className="dropdown-selection" key={error_type}>
                <li
                  style={{
                    "--hover-color": colorMappings[error_type],
                  } as React.CSSProperties}
                  onClick={() => handleTypeSelect(error_type)}
                >
                  <p>{error_type}</p>
                </li>
                <hr className="dropdown-divider" />
              </div>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PostEditContainer;