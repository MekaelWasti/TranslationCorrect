export const getSpanDiffs = (
    annotationSpans: any[],
    qaSpans: any[]
) => {
    let annotationRemainderSpans = [];
    let qaRemainderSpans = [];
    let sharedSpans = [];
    
    let annotationSpansCopy = structuredClone(annotationSpans);
    let qaSpansCopy = structuredClone(qaSpans);

    updateIndices(annotationSpansCopy, qaSpansCopy);
    updateIndices(qaSpansCopy, annotationSpansCopy);

    while (annotationSpansCopy && qaSpansCopy) {
        const annotationSpan = annotationSpansCopy[0];
        const qaSpan = qaSpansCopy[0];

        // Spans in the same location
        if (annotationSpan.start_index === qaSpan.start_index) {
            // Spans are identical
            if (annotationSpan.error_text_segment === qaSpan.error_text_segment &&
                annotationSpan.error_type === qaSpan.error_type &&
                annotationSpan.error_severity === qaSpan.error_severity
            ) {
                sharedSpans.push(annotationSpan);
                annotationSpansCopy.shift();
                qaSpansCopy.shift();
            // Spans are different
            } else {
                annotationRemainderSpans.push(annotationSpansCopy.shift());
                qaRemainderSpans.push(qaSpansCopy.shift());
            }
        // Spans are in different locations
        } else {
            // Remove the span with an earlier start index
            if (annotationSpan.start_index < qaSpan.start_index) {
                annotationRemainderSpans.push(annotationSpansCopy.shift());
            } else {
                qaRemainderSpans.push(qaSpansCopy.shift());
            }
        }
    }

    return [annotationRemainderSpans, qaRemainderSpans, sharedSpans];
}

// Updates the indices of arr2, mutating arr2.
const updateIndices = (
    arr1: any[],
    arr2: any[]
) => {
    // Assumes the spans are sorted by starting index

    for (let span1 of arr1) {
        if (span1.error_type === "Omission") {
            updateIndicesHelper(span1, arr2);
        }
    }
}

const updateIndicesHelper = (
    span1: any,
    arr2: any[]
) => {
    const span1Length = span1.end_index - span1.start_index;
    for (let span2 of arr2) {
        if (span2.start_index >= span1.start_index) {
            span2.start_index += span1Length;
            span2.end_index += span1Length;
        }
    }
}
