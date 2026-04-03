/** Consistent chart palette keyed by model family. */
export const CHART_COLORS: Record<string, string> = {
  sonnet: "var(--color-indigo-500, #6366f1)",
  haiku: "var(--color-amber-500, #f59e0b)",
  opus: "var(--color-purple-500, #a855f7)",
  "gpt-4o": "var(--color-emerald-500, #10b981)",
  "gpt-4o-mini": "var(--color-teal-500, #14b8a6)",
  "gemini-2.0-flash": "var(--color-blue-500, #3b82f6)",
  "gemini-2.5-pro": "var(--color-sky-500, #0ea5e9)",
};

/** Fallback chart colour when model is unknown. */
export const CHART_COLOR_DEFAULT = "var(--color-indigo-500, #6366f1)";

/** Display labels for model families used in chart legends and tooltips. */
export const MODEL_LABELS: Record<string, string> = {
  sonnet: "Sonnet",
  haiku: "Haiku",
  opus: "Opus",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
  "gemini-2.0-flash": "Gemini Flash",
  "gemini-2.5-pro": "Gemini Pro",
};
