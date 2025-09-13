export interface Span {
    start_index: number;
    end_index: number;
    error_text_segment: string;
    error_type: string;       
    error_severity: string;   
  }
  
  export const getSpanDiffs = (
    annotationSpans: Span[],
    qaSpans: Span[]
  ): [Span[], Span[], Span[]] => {
    const annotationRemainderSpans: Span[] = [];
    const qaRemainderSpans: Span[] = [];
    const sharedSpans: Span[] = [];
  
    const annotationSpansCopy = structuredClone(annotationSpans) as Span[];
    const qaSpansCopy = structuredClone(qaSpans) as Span[];
  
    updateIndices(annotationSpansCopy, qaSpansCopy);
    updateIndices(qaSpansCopy, annotationSpansCopy);
  
    while (annotationSpansCopy.length > 0 && qaSpansCopy.length > 0) {
      const annotationSpan = annotationSpansCopy[0];
      const qaSpan = qaSpansCopy[0];
  
        // Spans in the same location
      if (annotationSpan.start_index === qaSpan.start_index) {
        // Identical span
        if (
          annotationSpan.error_text_segment === qaSpan.error_text_segment &&
          annotationSpan.error_type === qaSpan.error_type &&
          annotationSpan.error_severity === qaSpan.error_severity
        ) {
          sharedSpans.push(annotationSpan);
          annotationSpansCopy.shift();
          qaSpansCopy.shift();
        } else {
          // Same location, but different details
          annotationRemainderSpans.push(annotationSpansCopy.shift()!);
          qaRemainderSpans.push(qaSpansCopy.shift()!);
        }
      } else {
        // Different locations, keep the earlier one
        if (annotationSpan.start_index < qaSpan.start_index) {
          annotationRemainderSpans.push(annotationSpansCopy.shift()!);
        } else {
          qaRemainderSpans.push(qaSpansCopy.shift()!);
        }
      }
    }
  
    // Handle leftovers if one list still has items
    if (annotationSpansCopy.length > 0) {
      annotationRemainderSpans.push(...annotationSpansCopy);
    }
    if (qaSpansCopy.length > 0) {
      qaRemainderSpans.push(...qaSpansCopy);
    }
  
    return [annotationRemainderSpans, qaRemainderSpans, sharedSpans];
  };
  
  // Updates arr2 indices based on omissions in arr1
  const updateIndices = (arr1: Span[], arr2: Span[]): void => {
    // Assumes both are sorted by start_index
    for (const span1 of arr1) {
      if (span1.error_type === "Omission") {
        updateIndicesHelper(span1, arr2);
      }
    }
  };
  
  const updateIndicesHelper = (span1: Span, arr2: Span[]): void => {
    const span1Length = span1.end_index - span1.start_index;
    for (const span2 of arr2) {
      if (span2.start_index >= span1.start_index) {
        span2.start_index += span1Length;
        span2.end_index += span1Length;
      }
    }
  };  