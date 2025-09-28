export interface Span {
    start_index: number;
    end_index: number;
    error_text_segment: string;
    error_type: string;
    error_severity: string;
}
  
export const getSpanDiffs = (
  aSpans: Span[],
  qSpans: Span[]
): [Span[], Span[], Span[]] => {
  const annotationRemainderSpans: Span[] = [];
  const qaRemainderSpans: Span[] = [];
  const sharedSpans: Span[] = [];

  const annotationSpans = copySpanArr(aSpans);
  const qaSpans = copySpanArr(aSpans);

  sortSpans(annotationSpans);
  sortSpans(qaSpans);

  const adjustedAnnotationSpans = copySpanArr(annotationSpans);
  const adjustedQaSpans = copySpanArr(qaSpans);

  adjustIndices(adjustedAnnotationSpans, adjustedQaSpans);
  
  while (adjustedAnnotationSpans.length > 0 && adjustedQaSpans.length > 0) {
    const annotationSpan = adjustedAnnotationSpans[0];
    const qaSpan = adjustedQaSpans[0];

      // Spans in the same location
    if (annotationSpan.start_index === qaSpan.start_index) {
      // Identical span
      if (
        annotationSpan.error_text_segment === qaSpan.error_text_segment &&
        annotationSpan.error_type === qaSpan.error_type &&
        annotationSpan.error_severity === qaSpan.error_severity
      ) {
        sharedSpans.push(annotationSpan);
        annotationSpans.shift()!;
        qaSpans.shift()!;
        adjustedAnnotationSpans.shift()!;
        adjustedQaSpans.shift()!;
      } else {
        // Same location, but different details
        annotationRemainderSpans.push(annotationSpans.shift()!);
        qaRemainderSpans.push(qaSpans.shift()!);
        adjustedAnnotationSpans.shift()!;
        adjustedQaSpans.shift()!;
      }
    } else {
      // Different locations, keep the earlier one
      if (annotationSpan.start_index < qaSpan.start_index) {
        annotationRemainderSpans.push(annotationSpans.shift()!);
        adjustedAnnotationSpans.shift()!;
      } else {
        qaRemainderSpans.push(qaSpans.shift()!);
        adjustedQaSpans.shift()!;
      }
    }
  }

  // Handle leftovers if one list still has items
  if (annotationSpans.length > 0) {
    annotationRemainderSpans.push(...annotationSpans);
  }
  if (qaSpans.length > 0) {
    qaRemainderSpans.push(...qaSpans);
  }

  // sharedSpans indices are shifted/adjusted, so we need to readjust them to
  // make sense by removing any offset caused by omission spans in
  // annotationRemainderSpans or qaRemainderSpans

  const annotationRemainderOmissions = copySpanArr(getOmissionSpans(annotationRemainderSpans));
  const qaRemainderOmissions = copySpanArr(getOmissionSpans(qaRemainderSpans));

  const leftoverOmissions = [...annotationRemainderOmissions, ...qaRemainderOmissions];
  sortSpans(leftoverOmissions);

  while (leftoverOmissions.length > 0) {
    const omission = leftoverOmissions.pop();
    for (const sharedSpan of sharedSpans) {
      const offset = omission.end_index - omission.start_index;
      // Need to remove offset caused by omission span that's not in sharedSpans
      if (omission.start_index < sharedSpan.start_index) {
        sharedSpan.start_index -= offset;
        sharedSpan.end_index -= offset;
      }
    }
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