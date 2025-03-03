import {
  DIFF_DELETE,
  DIFF_INSERT,
  DIFF_EQUAL,
  diff_match_patch,
} from "diff-match-patch";
import React, { useRef, useEffect } from "react";
import "../../index.css";
import { HighlightedError } from "../../types";
import { useSpanEvalContext } from "../SpanEvalProvider";
import HighlightedText from "./HighlightedText";
import { SpanScoreDropdown } from "../scoring/SpanScoreDropdown";

type PostEditContainerProps = {
  machineTranslation: string;
  setMachineTranslation: (newTranslation: string) => void;
  highlightedError: HighlightedError[];
  setHighlightedError: (newError: HighlightedError[]) => void;
  onDiffTextUpdate: (newDiffText: React.ReactNode) => void;
  modifiedText;
  setModifiedText: (newText: string) => void;
  addedErrorSpans: [] | any;
  setAddedErrorSpans: (newErrorSpans: [] | any) => void;
};

// **PostEditContainer Component**
export const PostEditContainer: React.FC<PostEditContainerProps> = ({
  machineTranslation,
  setMachineTranslation,
  highlightedError,
  setHighlightedError,
  onDiffTextUpdate,
  modifiedText,
  setModifiedText,
  addedErrorSpans,
  setAddedErrorSpans,
}) => {
  const editableDivRef = useRef<HTMLDivElement>(null);
  const { translatedText, addNewErrorSpan } = useSpanEvalContext();

  const caretOffsetRef = useRef<number>(0);

  // Helper functions for caret management:
  function getCaretCharacterOffsetWithin(element: Node): number {
    let caretOffset = 0;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
  }

  function setCaretPosition(element: Node, offset: number) {
    const range = document.createRange();
    const selection = window.getSelection();
    let currentOffset = 0;

    function traverseNodes(node: Node): boolean {
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0;
        if (currentOffset + textLength >= offset) {
          range.setStart(node, offset - currentOffset);
          range.collapse(true);
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          return true;
        }
        currentOffset += textLength;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          if (traverseNodes(node.childNodes[i])) {
            return true;
          }
        }
      }
      return false;
    }

    traverseNodes(element);
  }

  /**
   * Returns the selection start offset relative to the container's full text.
   */
  function getSelectionStartOffset(element: Node): number {
    let caretOffset = 0;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
  }

  const applyHighlight = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editableDivRef.current) return;

    // TODO: fix string index bug
    // const start = String(modifiedText).indexOf(selection.toString()); // This line looks for the FIRST occurance of a higlighted word, so if you highlight an occurance that is later in the target string, the first occurance get's highlighted instead
    const start = getSelectionStartOffset(editableDivRef.current);
    const selectedText = selection.toString();
    if (!selectedText.trim()) return;

    console.log(
      "AH",
      modifiedText.substring(start, start + selection.toString().length)
    );
    const original_text = modifiedText.substring(
      start,
      start + selectedText.length
    );
    addNewErrorSpan(
      original_text,
      start,
      start + selectedText.length,
      "Addition",
      "Minor"
    );

    setAddedErrorSpans([
      ...addedErrorSpans,
      {
        original_text: original_text,
        start_index_translation: start,
        end_index_translation: start + selection.toString().length,
        error_type: "Addition",
        error_severity: "Minor",
      },
    ]);

    setHighlightedError([
      ...highlightedError,
      {
        original_text: original_text,
        start_index_translation: start,
        end_index_translation: start + selection.toString().length,
        error_type: "Addition",
        error_severity: "Minor",
      },
    ]);
  };

  // const handleInput = () => {
  //   const newText = editableDivRef.current?.innerText || "";
  //   setModifiedText(newText);
  //   console.log("newText", newText);
  //   generateDiff(machineTranslation, newText);
  // };

  const handleInput = () => {
    console.log(highlightedError);
    if (!editableDivRef.current) return;
    // Save the caret offset before updating state.
    caretOffsetRef.current = getCaretCharacterOffsetWithin(
      editableDivRef.current
    );
    const newText = editableDivRef.current.innerText || "";

    // ---------- Incremental Change Detection ----------
    // Find the first index where the old and new texts differ.
    let changePos = 0;
    while (
      changePos < modifiedText.length &&
      changePos < newText.length &&
      modifiedText[changePos] === newText[changePos]
    ) {
      changePos++;
    }
    // Find matching portion from the end.
    let changeEndOld = modifiedText.length;
    let changeEndNew = newText.length;
    while (
      changeEndOld > changePos &&
      changeEndNew > changePos &&
      modifiedText[changeEndOld - 1] === newText[changeEndNew - 1]
    ) {
      changeEndOld--;
      changeEndNew--;
    }
    const delta = changeEndNew - changeEndOld; // positive for insertion, negative for deletion
    console.log(
      `Change region: [${changePos}, ${changeEndOld}) in old text, [${changePos}, ${changeEndNew}) in new text; delta = ${delta}`
    );
    // ---------- End Incremental Change Detection ----------

    // Update spans based on the change.
    // const updatedSpans = addedErrorSpans.map((span: any) => {
    const updatedSpans = highlightedError.map((span: any) => {
      const s = span.start_index_translation;
      const e = span.end_index_translation;
      let new_s = s;
      let new_e = e;

      if (e <= changePos) {
        // The span is completely before the change region.
        new_s = s;
        new_e = e;
      } else if (s >= changeEndOld) {
        // The span is completely after the change region: shift it.
        new_s = s + delta;
        new_e = e + delta;
      } else {
        // The span overlaps the change region.
        // If the span starts in the change region, set it to changePos.
        new_s = s < changePos ? s : changePos;
        // If the span extends beyond the change region, shift its end.
        new_e = e >= changeEndOld ? e + delta : changePos;
        if (new_e < new_s) new_e = new_s;
      }
      return {
        ...span,
        start_index_translation: new_s,
        end_index_translation: new_e,
      };
    });

    console.log("Updated spans:", updatedSpans);
    setAddedErrorSpans(updatedSpans);
    setHighlightedError(updatedSpans);
    setModifiedText(newText);
    generateDiff(machineTranslation, newText);
  };

  // Restore caret after re-render.
  useEffect(() => {
    if (editableDivRef.current) {
      setCaretPosition(editableDivRef.current, caretOffsetRef.current);
    }
  }, [modifiedText]);

  // After modifiedText updates (and the re-render completes), restore the caret position.
  useEffect(() => {
    if (editableDivRef.current) {
      setCaretPosition(editableDivRef.current, caretOffsetRef.current);
    }
  }, [modifiedText]);

  const generateDiff = (original: string, modified: string) => {
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
    onDiffTextUpdate(diffContent);
  };

  //   Return JSX
  return (
    <div>
      <div className="post-edit-section">
        <div className="post-edit-section-header">
          <h3>Post-Editing</h3>
        </div>
        <div className="post-edit-section-header-buttons">
          <button className="start-annotation-button">Start Annotation</button>
          <button className={`insert-span-button`} onClick={applyHighlight}>
            Insert Span
          </button>
          {/* <button className="custom-correction-button">Custom Correction</button> */}
          <SpanScoreDropdown />
        </div>
        <div
          className="post-edit-translation-field"
          ref={editableDivRef}
          onInput={handleInput}
          contentEditable={true}
          suppressContentEditableWarning={true}
        >
          <HighlightedText
            text={modifiedText}
            // highlights={addedErrorSpans}
            highlights={highlightedError}
            highlightKey="end_index_translation"
          />
        </div>
      </div>
    </div>
  );
};
