import React, { useState, useEffect, useCallback } from "react";
import { getSharedSpansSentence, getSpanDiffs, Span } from "../../util/qaComparisonUtils";
import { HighlightedError, colorMappings } from "../../types";
import "../../index.css";

interface QAComparisonContainerProps {
  sentenceData: any[];
  sentenceID: string;
  annotator: string;
  username: string;
  machineTranslation: string;
  onAgreedSpansChange?: (spans: Span[]) => void;
}

// Custom HighlightedText component for QA comparison with span selection and tooltip
interface QAHighlightedTextProps {
  text: string;
  highlights: HighlightedError[];
  highlightKey: string;
  onSpanClick: (span: HighlightedError, spanIndex: number, event: React.MouseEvent) => void;
  selectedSpanIndex: number | null;
  onSpanHover?: (span: HighlightedError, spanIndex: number, event: React.MouseEvent) => void;
  onSpanMove?: (event: React.MouseEvent) => void;
  onSpanLeave?: () => void;
}

const QAHighlightedText: React.FC<QAHighlightedTextProps> = ({
  text,
  highlights,
  highlightKey,
  onSpanClick,
  selectedSpanIndex,
  onSpanHover,
  onSpanMove,
  onSpanLeave,
}) => {
  // Build ranges from highlights
  const ranges = highlights.map((highlight, idx) => {
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

  const getHighlightedText = () => {
    if (ranges.length === 0) return text;

    const elements: (string | React.ReactElement)[] = [];
    let lastIndex = 0;

    // Sort ranges by start position
    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);

    sortedRanges.forEach((range) => {
      // Add text before the highlight
      if (range.start > lastIndex) {
        elements.push(text.substring(lastIndex, range.start));
      }

      // Add the highlighted span
      const highlightedText = text.substring(range.start, range.end);
      const isSelected = selectedSpanIndex === range.index;

      elements.push(
        <span
          key={`highlight-${range.start}-${range.end}`}
          className={`highlight qa-clickable-span ${isSelected ? "qa-span-selected" : ""}`}
          style={{
            backgroundColor: colorMappings[range.error_type],
            cursor: "pointer",
            position: "relative",
          }}
          onClick={(event) => onSpanClick(range.highlight, range.index, event)}
          onMouseEnter={(event) => onSpanHover?.(range.highlight, range.index, event)}
          onMouseMove={onSpanMove}
          onMouseLeave={onSpanLeave}
        >
          {highlightedText}
        </span>
      );

      lastIndex = range.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return elements;
  };

  return (
    <div>
      {getHighlightedText()}
    </div>
  );
};

const QAComparisonContainer: React.FC<QAComparisonContainerProps> = ({
  sentenceData,
  sentenceID,
  annotator,
  username,
  machineTranslation,
  onAgreedSpansChange,
}) => {
  const [annotationSpans, setAnnotationSpans] = useState<Span[]>([]);
  const [qaSpans, setQASpans] = useState<Span[]>([]);
  const [sharedSpans, setSharedSpans] = useState<Span[]>([]);
  const [hasQAForAnnotator, setHasQAForAnnotator] = useState<boolean>(false);
  const [annotatorCorrectedSentence, setAnnotatorCorrectedSentence] = useState<string>(machineTranslation);
  const [qaCorrectedSentence, setQACorrectedSentence] = useState<string>(machineTranslation);
  const [sharedSpansSentence, setSharedSpansSentence] = useState<string>(machineTranslation);

  // State for span selection and move functionality
  const [selectedSpan, setSelectedSpan] = useState<{
    span: Span;
    index: number;
    source: "annotator" | "qa";
  } | null>(null);
  const [moveButtonPosition, setMoveButtonPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // State for tooltip functionality
  const [hoveredHighlight, setHoveredHighlight] = useState<HighlightedError | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Load data when component mounts or when sentence/annotator changes
  const loadComparisonData = useCallback(() => {
    const currentSentence = sentenceData.find((item: any) => item._id === sentenceID);
    if (!currentSentence) {
      setAnnotationSpans([]);
      setQASpans([]);
      setSharedSpans([]);
      setHasQAForAnnotator(false);
      setAnnotatorCorrectedSentence(machineTranslation);
      setQACorrectedSentence(machineTranslation);
      setSharedSpansSentence(machineTranslation);
      setSelectedSpan(null);
      setMoveButtonPosition(null);
      setHoveredHighlight(null);
      setTooltipPosition(null);
      return;
    }

    // Get annotator spans
    const annotatorKey = `${annotator}_annotations`;
    const annotatorAnnotation = currentSentence.annotations?.[annotatorKey];
    const annotatorSpans: Span[] = annotatorAnnotation?.annotatedSpans?.map((span: any) => ({
      start_index: span.start_index,
      end_index: span.end_index,
      error_text_segment: span.error_text_segment,
      error_type: span.error_type,
      error_severity: span.error_severity,
    })) || [];

    // Set annotator corrected sentence
    const annotatorCorrected = annotatorAnnotation?.corrected_sentence || machineTranslation;
    setAnnotatorCorrectedSentence(annotatorCorrected);

    // Get QA user spans
    const qaKey = `${username}_qa`;
    const qaAnnotation = currentSentence.annotations?.[qaKey];
    
    // Check if the QA was done for the current annotator
    let qaUserSpans: Span[] = [];
    let hasQA = false;
    let qaCorrected = machineTranslation;
    
    if (qaAnnotation && qaAnnotation.annotator === annotator) {
      qaUserSpans = qaAnnotation.annotatedSpans?.map((span: any) => ({
        start_index: span.start_index,
        end_index: span.end_index,
        error_text_segment: span.error_text_segment,
        error_type: span.error_type,
        error_severity: span.error_severity,
      })) || [];
      
      // Set QA corrected sentence
      qaCorrected = qaAnnotation?.corrected_sentence || machineTranslation;
      hasQA = true;
    }

    setQACorrectedSentence(qaCorrected);
    setHasQAForAnnotator(hasQA);

    // Use getSpanDiffs to compare spans
    const [annotationRemainder, qaRemainder, shared] = getSpanDiffs(annotatorSpans, qaUserSpans);

    setSharedSpansSentence(getSharedSpansSentence(machineTranslation, shared));

    setAnnotationSpans(annotationRemainder);
    setQASpans(qaRemainder);
    setSharedSpans(shared);
    
    // Clear selection when data changes
    setSelectedSpan(null);
    setMoveButtonPosition(null);
    setHoveredHighlight(null);
    setTooltipPosition(null);
  }, [sentenceData, sentenceID, annotator, username, machineTranslation]);

  useEffect(() => {
    loadComparisonData();
  }, [loadComparisonData]);

  const convertSpansToHighlightedErrors = (spans: Span[]) => {
    return spans.map(span => ({
      original_text: span.error_text_segment,
      start_index_translation: span.start_index,
      end_index_translation: span.end_index,
      error_type: span.error_type,
      error_severity: span.error_severity,
    }));
  };

  // Handle span hover for tooltip
  const handleSpanHover = (span: HighlightedError, spanIndex: number, event: React.MouseEvent) => {
    setHoveredHighlight(span);
    
    // Position tooltip under span
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltipPosition({
      top: rect.bottom + 10, // Position below the span
      left: rect.left + rect.width / 2 - 75,
    });
  };

  const handleSpanMove = (event: React.MouseEvent) => {
    // tooltip will stay in same position
  };

  const handleSpanLeave = () => {
    setHoveredHighlight(null);
    setTooltipPosition(null);
  };

  // Handle span click
  const handleSpanClick = (span: HighlightedError, spanIndex: number, source: "annotator" | "qa", event: React.MouseEvent) => {
    
    // Find the actual span object
    const sourceSpans = source === "annotator" ? annotationSpans : qaSpans;
    const actualSpan = sourceSpans[spanIndex];
    
    if (!actualSpan) {
      console.log("No actual span found"); 
      return;
    }

    setSelectedSpan({
      span: actualSpan,
      index: spanIndex,
      source: source,
    });

    // Position the move button
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const buttonPosition = {
      top: rect.top - 45, 
      left: rect.left + rect.width / 2 - 75, // Center the button horizontally relative to the span
    };
    
    setMoveButtonPosition(buttonPosition);
  };

  // Handle moving span to agreed upon spans
  const handleMoveToAgreed = () => {
    if (!selectedSpan) return;

    const { span, index, source } = selectedSpan;

    // Add to shared spans
    const newSharedSpans = [...sharedSpans, span];
    setSharedSpans(newSharedSpans);

    // Notify parent component of the change
    if (onAgreedSpansChange) {
      onAgreedSpansChange(newSharedSpans);
    }

    // Remove from source spans
    if (source === "annotator") {
      setAnnotationSpans(prev => prev.filter((_, i) => i !== index));
    } else {
      setQASpans(prev => prev.filter((_, i) => i !== index));
    }

    // Clear selection
    setSelectedSpan(null);
    setMoveButtonPosition(null);
  };

  // Handle clicking outside to clear selection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.qa-clickable-span, .qa-move-button, .error-tooltip')) {
        setSelectedSpan(null);
        setMoveButtonPosition(null);
      }
    };

    const handleScroll = () => {
      setSelectedSpan(null);
      setMoveButtonPosition(null);
      setHoveredHighlight(null);
      setTooltipPosition(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Notify parent when shared spans are loaded initially
  useEffect(() => {
    if (onAgreedSpansChange) {
      onAgreedSpansChange(sharedSpans);
    }
  }, [sharedSpans, onAgreedSpansChange]);

  return (
    <div className="qa-comparison-container">
      {/* Annotator Spans Box */}
      <div className="qa-comparison-box annotator-spans-box">
        <div className="qa-comparison-header">
          <h3>Annotator Spans ({annotator})</h3>
          <span className="span-count">{annotationSpans.length} spans</span>
        </div>
        <div className="qa-comparison-content">
          <div className="qa-comparison-text">
            <QAHighlightedText
              text={annotatorCorrectedSentence}
              highlights={convertSpansToHighlightedErrors(annotationSpans)}
              highlightKey="end_index_translation"
              onSpanClick={(span, spanIndex, event) => 
                handleSpanClick(span, spanIndex, "annotator", event)
              }
              selectedSpanIndex={
                selectedSpan?.source === "annotator" ? selectedSpan.index : null
              }
              onSpanHover={handleSpanHover}
              onSpanMove={handleSpanMove}
              onSpanLeave={handleSpanLeave}
            />
          </div>
        </div>
      </div>

      {/* QA Spans Box */}
      <div className="qa-comparison-box qa-spans-box">
        <div className="qa-comparison-header">
          <h3>QA Spans ({username})</h3>
          <span className="span-count">{qaSpans.length} spans</span>
        </div>
        <div className="qa-comparison-content">
          <div className="qa-comparison-text">
            {hasQAForAnnotator ? (
              <QAHighlightedText
                text={qaCorrectedSentence}
                highlights={convertSpansToHighlightedErrors(qaSpans)}
                highlightKey="end_index_translation"
                onSpanClick={(span, spanIndex, event) => 
                  handleSpanClick(span, spanIndex, "qa", event)
                }
                selectedSpanIndex={
                  selectedSpan?.source === "qa" ? selectedSpan.index : null
                }
                onSpanHover={handleSpanHover}
                onSpanMove={handleSpanMove}
                onSpanLeave={handleSpanLeave}
              />
            ) : (
              <p className="no-qa-message">
                {username} has not QA'd {annotator}'s annotations for this sentence.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Agreed Upon Spans Box */}
      <div className="qa-comparison-box agreed-spans-box">
        <div className="qa-comparison-header">
          <h3>Agreed Upon Spans</h3>
          <span className="span-count">{sharedSpans.length} spans</span>
        </div>
        <div className="qa-comparison-content">
          <div className="qa-comparison-text">
            {hasQAForAnnotator ? (
              <QAHighlightedText
                text={sharedSpansSentence}
                highlights={convertSpansToHighlightedErrors(sharedSpans)}
                highlightKey="end_index_translation"
                onSpanClick={() => {}} // No click action for agreed spans
                selectedSpanIndex={null}
                onSpanHover={handleSpanHover}
                onSpanMove={handleSpanMove}
                onSpanLeave={handleSpanLeave}
              />
            ) : (
              <p className="no-qa-message">
                No agreed upon spans - {username} has not QA'd {annotator}'s annotations.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredHighlight && tooltipPosition && (
        <div 
          className="error-tooltip" 
          style={{
            position: "fixed",
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            zIndex: 10000,
            maxWidth: "300px",
            whiteSpace: "wrap",
          }}
        >
          <h3 style={{ 
            color: colorMappings[hoveredHighlight.error_type],
            margin: "0 0 4px 0",
            fontSize: "18px",
          }}>
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
                margin: "2px 0",
                fontSize: "16px"
              }}
            >
              <strong style={{ color: "white" }}>Error Severity:</strong>{" "}
              {hoveredHighlight.error_severity}
            </p>
            <p style={{ margin: "2px 0", fontSize: "16px" }}>
              <strong>Original Text:</strong> {hoveredHighlight.original_text}
            </p>
          </div>
        </div>
      )}

      {/* Move Button */}
      {selectedSpan && moveButtonPosition && (
        <button
          className="qa-move-button"
          style={{
            position: "fixed",
            top: moveButtonPosition.top,
            left: moveButtonPosition.left,
            zIndex: 9999,
            backgroundColor: "#4CAF50",
            color: "white",
            border: "2px solid #fff",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
            transition: "all 0.2s ease",
            minWidth: "150px",
          }}
          onClick={handleMoveToAgreed}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#45a049";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#4CAF50";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Add to Agreed Spans
        </button>
      )}
    </div>
  );
};

export default QAComparisonContainer;
