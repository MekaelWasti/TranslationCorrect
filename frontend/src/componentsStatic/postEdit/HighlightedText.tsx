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
  const [hoveredHighlight, setHoveredHighlight] =
    useState<HighlightedError | null>(null);

  const [spanDropdownVisible, setSpanDropdownVisible] = useState(false);

  const handleMouseEnterSpan = (
    e: React.MouseEvent<HTMLSpanElement>,
    highlight: HighlightedError
  ) => {
    if (!spanDropdown) {
      setHoveredHighlight(highlight);
    }

    const rect = e.currentTarget.getBoundingClientRect();
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
    setHoveredHighlight(null);
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
      setHoveredHighlight(highlight);
      console.log(highlight.error_severity);
      setSpanSeverity(highlight.error_severity);

      const rect = e.currentTarget.getBoundingClientRect();
      setSpanPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      });
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
      setSpanPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      });
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
                  onMouseEnter={(e) => handleMouseEnterSpan(e, h.highlight)}
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

      // Set the selected span to the last highlight's error type
      setSelectedSpan(lastHighlight.error_type);
      setSpanSeverity(lastHighlight.error_severity);

      // Set the selected span index to the last highlight's index
      setSelectedSpanIdx(highlights.length - 1);

      // Calculate position for the dropdown
      // We need to find the DOM element for the highlight
      // This is a bit tricky since we don't have a direct reference
      // Let's use a small timeout to ensure the DOM has been updated
      setTimeout(() => {
        const highlightElements = document.querySelectorAll(".highlight");
        if (highlightElements.length > 0) {
          // Get the last highlight element
          const lastHighlightElement =
            highlightElements[highlightElements.length - 1];
          const rect = lastHighlightElement.getBoundingClientRect();

          setSpanPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
          });

          // Show the dropdown
          setSpanDropdown(true);

          // Apply the fade-in animation
          requestAnimationFrame(() => {
            setDropdownAnimation("fade-in");
          });
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
      {spanDropdown && mousePosition && (
        <div
          ref={dropdownRef}
          className={`span-dropdown ${dropdownAnimation}`}
          onContextMenu={(event) => event.preventDefault()}
          contentEditable={false}
          style={{
            position: "absolute",
            left: spanPosition!.left - 20,
            top: spanPosition!.top + 40,
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
