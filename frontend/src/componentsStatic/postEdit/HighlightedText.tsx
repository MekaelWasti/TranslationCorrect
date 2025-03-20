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
  setHighlightInserted?: React.Dispatch<React.SetStateAction<boolean>>;
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
  const dropdownRef = useRef(null);

  const [selectedSpan, setSelectedSpan] = useState("");
  const [spanDropdown, setSpanDropdown] = useState(false);
  const [dropdownAnimation, setDropdownAnimation] = useState("");
  const [mousePosition, setMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [tooltipStyle, setTooltipStyle] = useState({ top: 0, left: 0 });
  const [spanPosition, setSpanPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [initialSpanPosition, setInitialSpanPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [hoveredHighlight, setHoveredHighlight] =
    useState<HighlightedError | null>(null);
  const [hoveredHighlightIdx, setHoveredHighlightIdx] = useState<number | null>(
    null
  );

  const [spanDropdownVisible, setSpanDropdownVisible] = useState(false);
  const [deleteButtonVisible, setDeleteButtonVisible] = useState(false);
  const [deleteButtonStyle, setDeleteButtonStyle] = useState({
    top: 0,
    left: 0,
  });

  const handleMouseEnterSpan = (
    e: React.MouseEvent<HTMLSpanElement>,
    highlight: HighlightedError,
    highlightIdx: number
  ) => {
    // Check if the span is inside the post-edit-translation-field
    if (!spanDropdown) {
      if (!e.currentTarget.closest(".post-edit-translation-field")) {
        setHoveredHighlight(highlight);
      }
      {
        setHoveredHighlightIdx(highlightIdx);
        setDeleteButtonVisible(true);
      }
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setSpanPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
    });

    // Position the delete button centered horizontally over the span
    // Calculate the center point of the span
    const spanWidth = rect.width;
    // const deleteButtonWidth = spanWidth < 24 ? spanWidth : 24; // Use span width if less than 24px
    const deleteButtonWidth = Math.max(spanWidth / 3, 30); // Use span width if less than 24px

    setDeleteButtonStyle({
      top: rect.top + window.scrollY - 30, // Position above the span with a small gap
      // left: rect.left + window.scrollX + spanWidth - deleteButtonWidth, // Center horizontally
      left: rect.left + window.scrollX + spanWidth / 2 - deleteButtonWidth / 2, // Center horizontally
      width: deleteButtonWidth, // Set the button width
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

    // // Position the delete button near the cursor
    // setDeleteButtonStyle({
    //   top: e.pageY - 40, // Position above the cursor
    //   left: e.pageX - 45, // Center horizontally
    // });
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

  const handleMouseLeaveSpan = () => {
    // Use a small delay to prevent the button from disappearing immediately
    // when the mouse moves from the span to the button
    setTimeout(() => {
      // Check if the mouse is over the delete button or the span
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
    // Update the select element's background color on any mouse click
    const selectElement = document.querySelector(".span-score-section select");
    if (selectElement) {
      (selectElement as HTMLElement).style.backgroundColor =
        colorMappings[highlight.error_type];
      // Set text color to white for better visibility
      (selectElement as HTMLElement).style.color = "#ffffff";
    }

    // Prevent left click from opening drop down menu since it is used for custom insertion
    if (e.button === 0) {
      setSelectedSpan(highlight.error_type);

      if (!e.currentTarget.closest(".post-edit-translation-field")) {
        setHoveredHighlight(highlight);
      }
      console.log(highlight.error_severity);
      setSpanSeverity(highlight.error_severity);

      const rect = e.currentTarget.getBoundingClientRect();

      // Calculate the center position of the highlight
      const centerX = rect.left + rect.width / 2;

      const newPosition = {
        top: rect.top + window.scrollY,
        left: centerX + window.scrollX - 75, // Center the dropdown (assuming dropdown width ~150px)
      };
      setSpanPosition(newPosition);

      // Store the initial position when clicking on a span
      setInitialSpanPosition(newPosition);

      setSelectedSpanIdx(highlightIdx);

      return;
    }

    if (highlight.error_type === selectedSpan && spanDropdown) {
      setDropdownAnimation("fade-out");
      setTimeout(() => {
        setSpanDropdown(false);
        setDropdownAnimation("");
      }, 250);
    } else {
      setSelectedSpan(highlight.error_type);
      setSpanSeverity(highlight.error_severity);

      // First set the dropdown to visible, then apply the animation in the next frame
      setSpanDropdown(true);

      // Use requestAnimationFrame to ensure the DOM has updated before applying the animation
      requestAnimationFrame(() => {
        setDropdownAnimation("fade-in");
      });

      setHoveredHighlight(highlight);

      const rect = e.currentTarget.getBoundingClientRect();

      // Calculate the center position of the highlight
      const centerX = rect.left + rect.width / 2;

      const newPosition = {
        top: rect.bottom + window.scrollY + 10, // Position below the highlight with a 5px gap
        left: centerX + window.scrollX - 75, // Center the dropdown (assuming dropdown width ~150px)
      };
      setSpanPosition(newPosition);

      // Store the initial position when opening dropdown
      setInitialSpanPosition(newPosition);
    }
    setHoveredHighlight(null);
    setSelectedSpanIdx(highlightIdx);
    // setHighlightInserted(false);
    e.stopPropagation();
  };

  useEffect(() => {
    const handleClickOutsideDropDown = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        spanDropdown
      ) {
        setDropdownAnimation("fade-out");
        setTimeout(() => {
          setSpanDropdown(false);
          setDropdownAnimation("");
        }, 250);
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

    // Add fade-out animation before closing the dropdown
    setDropdownAnimation("fade-out");

    // Close the dropdown after a short delay to allow the animation to play
    setTimeout(() => {
      setSpanDropdown(false);
      setDropdownAnimation("");
      // Reset highlight inserted flag if it was set
      if (highlightInserted) {
        setHighlightInserted(false);
      }
    }, 250);
    // Update the select element's background color on error type selection
    const selectElement = document.querySelector(".span-score-section select");
    if (selectElement) {
      (selectElement as HTMLElement).style.backgroundColor =
        colorMappings[type];
      // Set text color to white for better visibility
      (selectElement as HTMLElement).style.color = "#ffffff";
      // Add focus to the select element
      (selectElement as HTMLElement).focus();
      selectElement.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true })
      );
    }
  };

  const handleDeleteSpan = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();

    // Add visual feedback before deleting
    const button = e.currentTarget as HTMLButtonElement;
    button.style.transform = "scale(0.9)";
    button.style.opacity = "0.8";

    // Delay the deletion slightly to show the animation
    setTimeout(() => {
      deleteErrorSpan(idx);
      setDeleteButtonVisible(false);
      setHoveredHighlight(null);
      setHoveredHighlightIdx(null);
      // }, 150);
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
                  onMouseEnter={(e) =>
                    handleMouseEnterSpan(e, h.highlight, h.index)
                  }
                  onMouseLeave={handleMouseLeaveSpan}
                  onMouseMove={handleMouseMove}
                  onMouseDown={(e) =>
                    !disableEdit && handleMouseClick(e, h.highlight, h.index)
                  }
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

  // Effect to handle automatic dropdown opening when a span is inserted
  useEffect(() => {
    if (highlightInserted && highlights.length > 0 && !spanDropdown) {
      // Get the last inserted highlight (assuming it's the most recently added one)
      const lastHighlight = highlights[highlights.length - 1];
      const lastHighlightIdx = highlights.length - 1;

      // Set the selected span to the last highlight's error type
      setSelectedSpan(lastHighlight.error_type);
      setSpanSeverity(lastHighlight.error_severity);

      // Set the selected span index to the last highlight's index
      setSelectedSpanIdx(lastHighlightIdx);

      // Calculate position for the dropdown
      // We need to find the DOM element for the highlight
      // Use a small timeout to ensure the DOM has been updated
      setTimeout(() => {
        // Find all highlight elements
        const highlightElements = document.querySelectorAll(".highlight");

        if (highlightElements.length > 0) {
          // Find the highlight element that corresponds to our newly inserted span
          // We'll look for the element with text content matching our highlight
          let targetElement = null;

          // First try to find the exact match by content and position
          for (let i = 0; i < highlightElements.length; i++) {
            const el = highlightElements[i];
            const elText = el.textContent || "";

            // Check if this element matches our highlight
            if (
              elText === lastHighlight.translated_text ||
              elText === lastHighlight.original_text
            ) {
              targetElement = el;
              // If we find a match, use it
              break;
            }
          }

          // If we couldn't find an exact match, fallback to the last highlight element
          if (!targetElement && highlightElements.length > 0) {
            targetElement = highlightElements[highlightElements.length - 1];
          }

          if (targetElement) {
            const rect = targetElement.getBoundingClientRect();

            // Calculate the center position of the highlight
            const centerX = rect.left + rect.width / 2;

            // Position the dropdown below the highlight with some offset and centered
            const newPosition = {
              top: rect.bottom + window.scrollY + 10, // Position below the highlight with a 5px gap
              left: centerX + window.scrollX - 75, // Center the dropdown (assuming dropdown width ~150px)
            };

            setSpanPosition(newPosition);
            // Store the initial position for the dropdown
            setInitialSpanPosition(newPosition);

            setSpanDropdown(true);

            // Apply the fade-in animation
            requestAnimationFrame(() => {
              setDropdownAnimation("fade-in");
            });
          }
        }
      }, 50);
    }
  }, [highlightInserted, highlights]);

  return (
    <div>
      {elements}
      {hoveredHighlight && mousePosition && (
        <div className="error-tooltip" style={tooltipStyle}>
          <h3 style={{ color: colorMappings[hoveredHighlight.error_type] }}>
            Error Type: {hoveredHighlight.error_type}
          </h3>
          <div className="error-tooltip-text-display">
            <p>
              <strong>Original Text:</strong> {hoveredHighlight.original_text}
            </p>
            <p>
              <strong>Translated Text:</strong>{" "}
              {hoveredHighlight.translated_text}
            </p>
          </div>
          <p>
            <strong>Correct Text:</strong> {hoveredHighlight.correct_text}
          </p>
        </div>
      )}
      {deleteButtonVisible && hoveredHighlightIdx !== null && !disableEdit && (
        <button
          className={`delete-span-button ${
            deleteButtonVisible ? "visible" : ""
          }`}
          style={deleteButtonStyle}
          onClick={(e) => handleDeleteSpan(e, hoveredHighlightIdx)}
          onMouseEnter={() => setDeleteButtonVisible(true)}
        >
          {/* Delete */}X
        </button>
      )}
      {spanDropdown && (
        <div
          ref={dropdownRef}
          className={`span-dropdown ${dropdownAnimation}`}
          onContextMenu={(event) => event.preventDefault()}
          contentEditable={false}
          style={{
            position: "absolute",
            left: initialSpanPosition?.left || spanPosition?.left,
            top: initialSpanPosition?.top || spanPosition?.top,
            zIndex: 1000,
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
