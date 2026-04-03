/** Provider metadata for API key management and model grouping. */
export const PROVIDERS = [
  { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
  { id: "google", label: "Google", placeholder: "AIza..." },
] as const;

/** Quick lookup from provider ID to display name. */
export const PROVIDER_LABELS: Record<string, string> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p.label]),
);

/** Default interval in days for recurring scheduled analyses. */
export const DEFAULT_SCHEDULE_INTERVAL_DAYS = 30;
