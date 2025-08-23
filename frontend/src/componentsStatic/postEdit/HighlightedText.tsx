// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import React, {
  useState,
  useRef,
  useEffect,
  ReactElement,
  type MouseEvent,
} from "react";
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
  setHighlightInserted?: React.Dispatch<React.SetStateAction<boolean>>;
  setHighlightSeverity?: (severity: string) => void;
};

const HighlightedText: React.FC<HighlightTextProps> = ({
  text,
  highlights,
  highlightKey,
  disableEdit = false,
  highlightInserted = false,
  setHighlightInserted,
  setHighlightSeverity,
}) => {
  const {
    selectedSpanIdx,
    setSelectedSpanIdx,
    updateSpanErrorType,
    errorSpans,
    setSpanSeverity,
    deleteErrorSpan,
  } = useSpanEvalContext();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State for hover/tooltip/delete-on-hover
  const [hoveredHighlight, setHoveredHighlight] =
    useState<HighlightedError | null>(null);
  const [hoveredHighlightIdx, setHoveredHighlightIdx] = useState<number | null>(
    null
  );
  const [mousePosition, setMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<{
    top: number;
    left: number;
  }>({
    top: 0,
    left: 0,
  });
  const [deleteButtonVisible, setDeleteButtonVisible] = useState(false);
  const [deleteButtonStyle, setDeleteButtonStyle] = useState<{
    top: number;
    left: number;
    width?: number;
  }>({ top: 0, left: 0 });

  // State for right-click dropdown (“change error type”)
  const [selectedSpan, setSelectedSpan] = useState<string>("");
  const [spanDropdown, setSpanDropdown] = useState(false);
  const [dropdownAnimation, setDropdownAnimation] = useState<string>("");
  const [spanPosition, setSpanPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [initialSpanPosition, setInitialSpanPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Handle mouse entering a highlighted span
  const handleMouseEnterSpan = (
    e: React.MouseEvent<HTMLSpanElement>,
    highlight: HighlightedError,
    highlightIdx: number
  ) => {
    // Only update hoveredHighlight if dropdown isn’t open:
    if (!spanDropdown) {
      setHoveredHighlight(highlight);
      setHoveredHighlightIdx(highlightIdx);
      setDeleteButtonVisible(true);
    }

    // Compute where to place the delete‐icon button:
    const rect = e.currentTarget.getBoundingClientRect();
    const spanWidth = rect.width;
    const deleteButtonWidth = Math.max(spanWidth / 3, 30);

    setDeleteButtonStyle({
      top: rect.top + window.scrollY - 30,
      left: rect.left + window.scrollX + spanWidth / 2 - deleteButtonWidth / 2,
      width: deleteButtonWidth,
    });

    // Also capture spanPosition (used if you want to show dropdown on hover)
    setSpanPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
    });
  };

  // Handle mouse moving inside a highlighted span
  // Used to update tooltip position dynamically
  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (hoveredHighlight || spanDropdown) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
    setTooltipStyle({
      top: e.pageY + 25,
      left: e.pageX - 125,
    });
  };

  // Handle mouse leaving a highlighted span
  // wait a bit, then hide tooltip + delete button unless user is on the delete button
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

  // Handle click (left or right) on a span
  const handleMouseClick = (
    e: React.MouseEvent<HTMLSpanElement>,
    highlight: HighlightedError,
    highlightIdx: number
  ) => {
    // Update any select box’s background color:
    const selectElement = document.querySelector(".span-score-section select");
    if (selectElement) {
      (selectElement as HTMLElement).style.backgroundColor =
        colorMappings[highlight.error_type];
      (selectElement as HTMLElement).style.color = "#ffffff";
    }

    // If it’s a left‐click: simply select the span for editing but don't open dropdown
    if (e.button === 0) {
      setSelectedSpan(highlight.error_type);
      setHoveredHighlight(highlight);
      setSpanSeverity(highlight.error_severity);

      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const newPosition = {
        top: rect.top + window.scrollY,
        left: centerX + window.scrollX - 75,
      };
      setSpanPosition(newPosition);
      setInitialSpanPosition(newPosition);
      setSelectedSpanIdx(highlightIdx);

      return;
    }

    // Otherwise (right‐click), open/close the “change error‐type” dropdown:
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

      // Trigger fade‐in on next repaint
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
      setSelectedSpanIdx(highlightIdx);
    }
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
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

  // If user clicks anywhere outside a highlight or delete button, hide hover UI
  useEffect(() => {
    const onDocClick = (ev: globalThis.MouseEvent) => {
      if (
        !(ev.target as HTMLElement).closest(".highlight, .delete-span-button")
      ) {
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

  // Handler to actually delete a span
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

  // “Change error type” dropdown item clicked
  const handleTypeSelect = (type: string) => {
    updateSpanErrorType(selectedSpanIdx!, type);
    setDropdownAnimation("fade-out");
    setTimeout(() => {
      setSpanDropdown(false);
      setDropdownAnimation("");
    }, 250);
    // Update the select element's background color on error type selection
    const selectElement = document.querySelector(".span-score-section select");
    if (selectElement) {
      (selectElement as HTMLElement).style.backgroundColor =
        colorMappings[type];
      (selectElement as HTMLElement).style.color = "#ffffff";
      // Add focus to the select element
      (selectElement as HTMLElement).focus();
      selectElement.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true })
      );
    }
  };

  // Build an array of “ranges” from your highlights prop
  interface Range {
    start: number;
    end: number;
    error_type: string;
    highlight: HighlightedError;
    index: number;
  }
  const ranges: Range[] = highlights.map((highlight, idx) => {
    const startKey = highlightKey.includes("end")
      ? (highlightKey.replace("end", "start") as keyof HighlightedError)
      : (highlightKey as keyof HighlightedError);
    return {
      start: highlight[startKey] as number,
      end: highlight[highlightKey] as number,
      error_type: highlight.error_type,
      highlight,
      index: idx,
    };
  });

  /**
   * Renders the text that resides in this component. Applies highlighting to the text based on the provided ranges.
   *
   */
  const getHighlightedText = (
    nodes: React.ReactNode[],
    highlightsArr: Range[],
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

        // Find all highlights that intersect this text node
        const nodeHighlights = highlightsArr.filter(
          (h) => h.start < nodeEndIndex && h.end > nodeStartIndex
        );

        if (nodeHighlights.length === 0) {
          // No highlight → push raw text
          elements.push(nodeText);
        } else {
          let lastIndex = 0;
          const fragments: (string | ReactElement)[] = [];

          // Sort by start to break out fragments
          nodeHighlights
            .sort((a, b) => a.start - b.start)
            .forEach((h) => {
              const highlightStart = Math.max(h.start - nodeStartIndex, 0);
              const highlightEnd = Math.min(h.end - nodeStartIndex, nodeLength);

              // Any text before this highlight
              if (highlightStart > lastIndex) {
                fragments.push(nodeText.substring(lastIndex, highlightStart));
              }

              // The highlighted substring
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
                  onMouseEnter={(e) =>
                    handleMouseEnterSpan(e, h.highlight, h.index)
                  }
                  onMouseLeave={handleMouseLeaveSpan}
                  onMouseMove={handleMouseMove}
                  onMouseDown={(e) =>
                    !disableEdit && handleMouseClick(e, h.highlight, h.index)
                  }
                  onContextMenu={(e) => {
                    if (!disableEdit) e.preventDefault();
                  }}
                >
                  {highlightedText}
                </span>
              );

              lastIndex = highlightEnd;
            });

          // Any trailing text after the last highlight
          if (lastIndex < nodeLength) {
            fragments.push(nodeText.substring(lastIndex));
          }

          elements.push(...fragments);
        }

        localIndex += nodeLength;
      } else if (React.isValidElement(node)) {
        // If it’s a React element, recurse into its children
        const childNodes = React.Children.toArray(node.props.children);
        const { elements: childElements, currentIndex: newIndex } =
          getHighlightedText(childNodes, highlightsArr, localIndex);
        localIndex = newIndex;

        elements.push(
          React.cloneElement(node, { key: `node-${idx}` }, childElements)
        );
      }
    });

    return { elements, currentIndex: localIndex };
  };

  const { elements } = getHighlightedText(React.Children.toArray(text), ranges);

  // Handle auto‐opening dropdown when user clicks the add button
  useEffect(() => {
    if (highlightInserted && highlights.length > 0 && !spanDropdown) {
      // Get the last inserted highlight 
      const lastHighlight = highlights[highlights.length - 1];
      const lastHighlightIdx = highlights.length - 1;

      // Set the selected span to the last highlight's error type
      setSelectedSpan(lastHighlight.error_type);
      setSpanSeverity(lastHighlight.error_severity);

      // Set the selected span index to the last highlight's index
      setSelectedSpanIdx(lastHighlightIdx);

      // Calculate position for the dropdown
      setTimeout(() => {
        const highlightElems = document.querySelectorAll(".highlight");
        let targetElem: Element | null = null;

        for (let i = 0; i < highlightElems.length; i++) {
          const el = highlightElems[i];
          if (
            el.textContent === lastHighlight.translated_text ||
            el.textContent === lastHighlight.original_text
          ) {
            targetElem = el;
            break;
          }
        }
        // Only proceed if we found the correct target element
        // Don't fall back to the last element as it might be a different span
        if (targetElem) {
          const rect = (targetElem as HTMLElement).getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;

          // Position the dropdown below the highlight with some offset and centered
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
        }
              }, 50);
      }
    }, [highlightInserted]); 



  return (
    <div>
      {elements}

      {/* Tooltip: show whenever hoveredHighlight && we have a mousePosition */}
      {hoveredHighlight && mousePosition && (
        <div className="error-tooltip" style={tooltipStyle}>
          <h3 style={{ color: colorMappings[hoveredHighlight.error_type] }}>
            Error Type: {hoveredHighlight.error_type}
          </h3>
          <div className="error-tooltip-text-display">
            {/* Example: show severity in different colors */}
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
            <p>
              {/* <strong>Correct Text:</strong> {hoveredHighlight.correct_text} */}
            </p>
          </div>
        </div>
      )}

      {/* Delete‐icon button: show above the highlighted span on hover */}
      {deleteButtonVisible && hoveredHighlightIdx !== null && !disableEdit && (
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

      {/* Right‐click dropdown for “change error type” */}
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
                  style={
                    {
                      "--hover-color": colorMappings[error_type],
                    } as React.CSSProperties
                  }
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
