export interface HighlightedError {
  original_text: string;
  translated_text?: string;
  correct_text?: string;
  error_confidence?: number;
  start_index_orig?: number;
  end_index_orig?: number;
  start_index_translation: number;
  end_index_translation: number;
  error_type: string;
  error_severity: string;
}

// export const colorMappings: { [key: string]: string } = {
//   "Addition of Text": "#FF5733",
//   "Negation Errors": "#00A0F0",
//   "Mask In-filling": "#59c00a",
//   "Named Entity (NE) Errors": "#D3365A",
//   "Number (NUM) Errors": "#8B4513",
//   "Hallucinations": "#800080",
//   "No Error": "#2f3472"
// };

// export const colorMappings: { [key: string]: string } = {
//   "Addition": "#FF5733",
//   "Omission": "#00A0F0",
//   "Mistranslation": "#59c00a",
//   "Untranslated": "#D3365A",
//   "Grammar": "#8B4513",
//   "Spelling": "#800080",
//   "Typography": "#2f3472",
//   "Unintelligible": "#800000"
// };

export const colorMappings: { [key: string]: string } = {
  "Addition": "#FF5733",
  "Omission": "#00A0F0",
  "Mistranslation": "#59c00a",
  "Untranslated": "#D3365A",
  "Grammar": "#D2691E",
  "Spelling": "#9B59B6",
  "Typography": "#1ABC9C",
  "Unintelligible": "#F39C12",
  "N/A": "#767676"
};
