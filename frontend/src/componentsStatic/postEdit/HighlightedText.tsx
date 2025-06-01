// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import React, { useState, useRef, useEffect, ReactElement } from "react";
import { HighlightedError, colorMappings } from "../../types";
import "../../index.css";
import { useSpanEvalContext } from "../SpanEvalProvider";

// This component is used to render text that requires span editing behaviour (insertion, error tooltip, error type selection, etc.)

type HighlightTextProps = {
  text: React.ReactNode;
  highlights: HighlightedError[];
  highlightKey:
    | "start_index_orig"
    | "end_index_orig"
    | "start_index_translation"
    | "end_index_translation"
    | "error_type";
  disableEdit?: boolean;
  highlightInserted?: boolean;
};

const HighlightedText: React.FC<HighlightTextProps> = ({
  text,
  highlights,
  highlightKey,
  disableEdit = false,
  highlightInserted = false,
}) => {
  const {
    selectedSpanIdx,
    setSelectedSpanIdx,
    updateSpanErrorType,
    errorSpans,
    setSpanSeverity,
    deleteErrorSpan,
  } = useSpanEvalContext();
  const dropdownRef = useRef(null);

  const [selectedSpan, setSelectedSpan] = useState("");
  const [spanDropdown, setSpanDropdown] = useState(false);
  const [mousePosition, setMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [tooltipStyle, setTooltipStyle] = useState({ top: 0, left: 0 });
  const [spanPosition, setSpanPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [hoveredHighlight, setHoveredHighlight] =
    useState<HighlightedError | null>(null);

  // State to manage the visibility of the delete button
  const [deleteButtonVisible, setDeleteButtonVisible] = useState(false);
  const [deleteButtonStyle, setDeleteButtonStyle] = useState({
    top: 0,
    left: 0,
  });

  const [hoveredHighlightIdx, setHoveredHighlightIdx] = useState<number | null>(
    null
  );

  const handleMouseEnterSpan = (
    e: React.MouseEvent<HTMLSpanElement>,
    highlight: HighlightedError,
    highlightIdx: number
  ) => {
    // only update which span is “hovered” if no dropdown is open
    if (!spanDropdown) {
      setHoveredHighlight(highlight);
      setHoveredHighlightIdx(highlightIdx);
    }

    // always compute & show the delete button
    const rect = e.currentTarget.getBoundingClientRect();
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
      if (!document.querySelector(".delete-span-button:hover")) {
        setDeleteButtonVisible(false);
        setHoveredHighlightIdx(null);
        setHoveredHighlight(null);
      }
    }, 100);
  };

  // useEffect(() => {
  //   const handleMouseMove = (e: MouseEvent) => {
  //     if (highlightInserted) {
  //       console.log("AH", highlightInserted);
  //       // setSpanDropdown(true);
  //     }
  //   };

  //   // Add event listener for mouse move
  //   document.addEventListener("click", handleMouseMove);

  //   // Cleanup function to remove event listener
  //   return () => {
  //     document.removeEventListener("click", handleMouseMove);
  //   };
  // }, [highlightInserted]);

  const handleMouseClick = (
    e: React.MouseEvent<HTMLSpanElement>,
    highlight: HighlightedError,
    highlightIdx: number
  ) => {
    // Prevent left-click from bubbling and opening the dropdown
    if (e.button === 0) {
      e.stopPropagation();

      // color the select box
      const selectEl = document.querySelector(".span-score-section select");
      if (selectEl) {
        (selectEl as HTMLElement).style.backgroundColor =
          colorMappings[highlight.error_type];
        (selectEl as HTMLElement).style.color = "#fff";
      }

      // set up tooltip/highlight state
      setSelectedSpan(highlight.error_type);
      setHoveredHighlight(highlight);
      setSpanSeverity(highlight.error_severity);
      setSelectedSpanIdx(highlightIdx);
      setSpanDropdown(false);

      // position and show the delete button
      const rect = e.currentTarget.getBoundingClientRect();
      setDeleteButtonStyle({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      });
      setDeleteButtonVisible(true);

      return;
    }

    // ——— Right-click or other buttons open your type-selection dropdown ———
    e.stopPropagation();
    if (highlight.error_type === selectedSpan && spanDropdown) {
      setSpanDropdown(false);
    } else {
      setSelectedSpan(highlight.error_type);
      setSpanSeverity(highlight.error_severity);
      setSpanDropdown(true);
      setHoveredHighlight(highlight);

      const rect = e.currentTarget.getBoundingClientRect();
      setSpanPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  };

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      // if we didn’t click on a highlight or the delete button...
      if (
        !(ev.target as HTMLElement).closest(".highlight, .delete-span-button")
      ) {
        setHoveredHighlight(null);
        setHoveredHighlightIdx(null);
        setDeleteButtonVisible(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const handleClickOutsideDropDown = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSpanDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideDropDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideDropDown);
    };
  }, [spanDropdown]);

  const handleTypeSelect = (type: string) => {
    updateSpanErrorType(selectedSpanIdx!, type);
    console.log(errorSpans);

    setSpanDropdown(false);

    // Update the select element's background color on error type selection
    const selectElement = document.querySelector(".span-score-section select");
    if (selectElement) {
      (selectElement as HTMLElement).style.backgroundColor =
        colorMappings[type];
      // Set text color to white for better visibility
      (selectElement as HTMLElement).style.color = "#ffffff";
    }
  };

  const handleDeleteSpan = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    // optional visual feedback
    const button = e.currentTarget as HTMLButtonElement;
    button.style.transform = "scale(0.9)";
    button.style.opacity = "0.8";

    setTimeout(() => {
      deleteErrorSpan(idx);
      setDeleteButtonVisible(false);
      setHoveredHighlight(null);
      setHoveredHighlightIdx(null);
    }, 0);
  };

  // console.log(highlights);

  interface Range {
    start: number;
    end: number;
    error_type: string;
    highlight: HighlightedError;
    index: number;
  }
  // Prepare ranges with indices
  const ranges = highlights.map((highlight, idx) => {
    const startKey = highlightKey.includes("end")
      ? (highlightKey.replace("end", "start") as keyof HighlightedError)
      : highlightKey;
    return {
      start: highlight[startKey] as number,
      end: highlight[highlightKey] as number,
      error_type: highlight.error_type,
      highlight,
      index: idx, // Track highlight index
    } as Range;
  });

  /**
   * Renders the text that resides in this component. Applies highlighting to the text based on the provided ranges.
   *
   */
  const getHighlightedText = (
    nodes: React.ReactNode[],
    highlights: Range[],
    currentIndex = 0
  ) => {
    const elements: (string | ReactElement)[] = [];
    let localIndex = currentIndex;

    nodes.forEach((node, idx) => {
      if (typeof node === "string") {
        const nodeText = node;
        const nodeLength = nodeText.length;
        const nodeStartIndex = localIndex;
        const nodeEndIndex = localIndex + nodeLength;

        const nodeHighlights = highlights.filter(
          (h) => h.start < nodeEndIndex && h.end > nodeStartIndex
        );

        if (nodeHighlights.length === 0) {
          elements.push(nodeText);
        } else {
          let lastIndex = 0;
          const fragments = [];

          nodeHighlights
            .sort((a, b) => a.start - b.start)
            .forEach((h) => {
              const highlightStart = Math.max(h.start - nodeStartIndex, 0);
              const highlightEnd = Math.min(h.end - nodeStartIndex, nodeLength);

              if (highlightStart > lastIndex) {
                fragments.push(nodeText.substring(lastIndex, highlightStart));
              }

              const highlightedText = nodeText.substring(
                highlightStart,
                highlightEnd
              );

              fragments.push(
                <span
                  key={`highlight-${nodeStartIndex + highlightStart}`}
                  className={`highlight ${
                    selectedSpanIdx === h.index && !disableEdit
                      ? "highlight-selected"
                      : ""
                  }`}
                  style={{
                    backgroundColor: colorMappings[h.error_type],
                  }}
                  // onMouseEnter={(e) => handleMouseEnterSpan(e, h.highlight)}
                  onMouseEnter={(e) =>
                    handleMouseEnterSpan(e, h.highlight, h.index)
                  }
                  onMouseLeave={handleMouseLeaveSpan}
                  onMouseMove={handleMouseMove}
                  onMouseDown={(e) =>
                    !disableEdit && handleMouseClick(e, h.highlight, h.index)
                  }
                  // onMouseDown={(e) => handleMouseClick(e, h.highlight, h.index)}
                  onContextMenu={(e) => {
                    // Stop context menu from appearing on right click in post edit section
                    if (!disableEdit) {
                      e.preventDefault();
                    }
                  }}
                >
                  {highlightedText}
                </span>
              );

              lastIndex = highlightEnd;
            });

          if (lastIndex < nodeLength) {
            fragments.push(nodeText.substring(lastIndex));
          }

          elements.push(...fragments);
        }

        localIndex += nodeLength;
      } else if (React.isValidElement(node)) {
        const childNodes = React.Children.toArray(node.props.children);
        const { elements: childElements, currentIndex: newIndex } =
          getHighlightedText(childNodes, highlights, localIndex);

        localIndex = newIndex;

        elements.push(
          React.cloneElement(node, { key: `node-${idx}` }, childElements)
        );
      }
    });

    return { elements, currentIndex: localIndex };
  };

  const { elements } = getHighlightedText(React.Children.toArray(text), ranges);

  return (
    <div>
      {elements}
      {hoveredHighlight && mousePosition && (
        <div className="error-tooltip" style={tooltipStyle}>
          <p style={{ color: colorMappings[hoveredHighlight.error_type] }}>
            <strong>Error Type:</strong> {hoveredHighlight.error_type}
          </p>
          <p>
            <strong>Original Text:</strong> {hoveredHighlight.original_text}
          </p>
          <p>
            <strong>Translated Text:</strong> {hoveredHighlight.translated_text}
          </p>
          <p>
            <strong>Correct Text:</strong> {hoveredHighlight.correct_text}
          </p>
        </div>
      )}
      {deleteButtonVisible && hoveredHighlightIdx !== null && !disableEdit && (
        <button
          className={`delete-span-button visible`}
          style={deleteButtonStyle}
          onClick={(e) => handleDeleteSpan(e, hoveredHighlightIdx)}
          onMouseEnter={() => setDeleteButtonVisible(true)}
        >
          X
        </button>
      )}
      {spanDropdown && mousePosition && (
        <div
          ref={dropdownRef}
          className="span-dropdown"
          onContextMenu={(event) => event.preventDefault()}
          contentEditable={false}
          style={{
            position: "absolute",
            left: spanPosition!.left - 20,
            top: spanPosition!.top + 25,
          }}
        >
          <ul>
            {Object.keys(colorMappings).map((error_type) => (
              <div className="dropdown-selection" key={error_type}>
                <li
                  style={{
                    // color: colorMappings[error_type],
                    "--hover-color": colorMappings[error_type],
                  }}
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

export default HighlightedText;
