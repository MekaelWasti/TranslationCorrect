import React, { useState, useEffect, useCallback } from "react";
import { getSpanDiffs, Span } from "../../util/getSpanDiffs";
import HighlightedText from "../postEdit/HighlightedText";
import "../../index.css";

interface QAComparisonContainerProps {
  sentenceData: any[];
  sentenceID: string;
  annotator: string;
  username: string;
  machineTranslation: string;
}

const QAComparisonContainer: React.FC<QAComparisonContainerProps> = ({
  sentenceData,
  sentenceID,
  annotator,
  username,
  machineTranslation,
}) => {
  const [annotationSpans, setAnnotationSpans] = useState<Span[]>([]);
  const [qaSpans, setQASpans] = useState<Span[]>([]);
  const [sharedSpans, setSharedSpans] = useState<Span[]>([]);
  const [hasQAForAnnotator, setHasQAForAnnotator] = useState<boolean>(false);

  // Load data when component mounts or when sentence/annotator changes
  const loadComparisonData = useCallback(() => {

    const currentSentence = sentenceData.find((item: any) => item._id === sentenceID);
    if (!currentSentence) {
      setAnnotationSpans([]);
      setQASpans([]);
      setSharedSpans([]);
      setHasQAForAnnotator(false);
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

    // Get QA user spans
    const qaKey = `${username}_qa`;
    const qaAnnotation = currentSentence.annotations?.[qaKey];
    
    // Check if the QA was done for the current annotator
    let qaUserSpans: Span[] = [];
    let hasQA = false;
    if (qaAnnotation && qaAnnotation.annotator === annotator) {
      qaUserSpans = qaAnnotation.annotatedSpans?.map((span: any) => ({
        start_index: span.start_index,
        end_index: span.end_index,
        error_text_segment: span.error_text_segment,
        error_type: span.error_type,
        error_severity: span.error_severity,
      })) || [];
      hasQA = true;
    }

    setHasQAForAnnotator(hasQA);

    // Use getSpanDiffs to compare spans
    const [annotationRemainder, qaRemainder, shared] = getSpanDiffs(annotatorSpans, qaUserSpans);

    setAnnotationSpans(annotationRemainder);
    setQASpans(qaRemainder);
    setSharedSpans(shared);
  }, [sentenceData, sentenceID, annotator, username]);

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
            <HighlightedText
              text={machineTranslation}
              highlights={convertSpansToHighlightedErrors(annotationSpans)}
              highlightKey="end_index_translation"
              disableEdit={true}
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
              <HighlightedText
                text={machineTranslation}
                highlights={convertSpansToHighlightedErrors(qaSpans)}
                highlightKey="end_index_translation"
                disableEdit={true}
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
              <HighlightedText
                text={machineTranslation}
                highlights={convertSpansToHighlightedErrors(sharedSpans)}
                highlightKey="end_index_translation"
                disableEdit={true}
              />
            ) : (
              <p className="no-qa-message">
                No agreed upon spans - {username} has not QA'd {annotator}'s annotations.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QAComparisonContainer;
