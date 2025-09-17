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

  const annotationSpansCopy = copySpanArr(annotationSpans);
  const qaSpansCopy = copySpanArr(qaSpans);

  sortSpans(annotationSpansCopy);
  sortSpans(qaSpansCopy);

  adjustIndices(annotationSpansCopy, qaSpansCopy);
  
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

const adjustIndices = (arr1: Span[], arr2: Span[]): void => {

  // Something weird happens if we don't call copySpanArr, my working theory
  // is that some of the common spans actually have the same memory address,
  // so that makes things weird if we don't explicitly create a copy.
  const a1OmissionSpans: Span[] = copySpanArr(getOmissionSpans(arr1));
  const a2OmissionSpans: Span[] = copySpanArr(getOmissionSpans(arr2));

  while (a1OmissionSpans.length > 0 || a2OmissionSpans.length > 0) {
    // Only have a2OmissionSpans left
    if (a1OmissionSpans.length == 0) {
      adjustIndicesHelper(a2OmissionSpans.shift(), arr1);

    // Only have a1OmissionSpans left
    } else if (a2OmissionSpans.length == 0) {
      adjustIndicesHelper(a1OmissionSpans.shift(), arr2);

    // Both sets have an omission span in the same location
    } else if (a1OmissionSpans[0].start_index == a2OmissionSpans[0].start_index &&
                a1OmissionSpans[0].end_index == a2OmissionSpans[0].end_index) {
      a1OmissionSpans.shift();
      a2OmissionSpans.shift();

    } else if (a1OmissionSpans[0].start_index < a2OmissionSpans[0].start_index) {
      const span: Span = a1OmissionSpans.shift();
      adjustIndicesHelper(span, arr2);
      adjustIndicesHelper(span, a2OmissionSpans);

    } else {
      const span: Span = a2OmissionSpans.shift();
      adjustIndicesHelper(span, arr1);
      adjustIndicesHelper(span, a1OmissionSpans);
    }
  }
};

const adjustIndicesHelper = (span1: Span, arr2: Span[]): void => {
  const span1Length = span1.end_index - span1.start_index;
  for (const span2 of arr2) {
    if (span2.start_index >= span1.start_index) {
      span2.start_index += span1Length;
      span2.end_index += span1Length;
    }
  }
};  

const getOmissionSpans = (spans: Span[]): Span[] => {
  let omissionSpans: Span[] = [];
  for (const span of spans) {
    if (span.error_type === "Omission") {
      omissionSpans.push(span);
    }
  }
  return omissionSpans;
}

const sortSpans = (spans: Span[]): void => {
  for (let i = 0; i < spans.length; i++) {
      for (let j = 0; j < spans.length; j++) {
          if (spans[j].start_index > spans[i].start_index) {
              [spans[j], spans[i]] = [spans[i], spans[j]];
          }
      }
  }
};

const copySpanArr = (spans: Span[]): Span[] => {
  let spansCopy: Span[] = [];
  for (let span of spans) {
      let spanCopy: Span = {
          start_index: span.start_index,
          end_index: span.end_index,
          error_text_segment: span.error_text_segment,
          error_type: span.error_type,       
          error_severity: span.error_severity,
      }
      spansCopy.push(spanCopy);
  };
  return spansCopy;
}