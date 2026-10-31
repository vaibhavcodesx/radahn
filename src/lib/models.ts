/** Chat models offered in the composer picker. The server still falls back silently if one is busy. */
export const CHAT_MODELS = [
  { id: "gemini-3.8-flash", label: "3.8 Flash", hint: "Best answers" },
  { id: "gemini-3.6-flash", label: "3.6 Flash", hint: "Fast and steady" },
  { id: "gemini-3.5-flash-lite", label: "Flash-Lite", hint: "Fastest" },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];
export const DEFAULT_CHAT_MODEL: ChatModelId = "gemini-3.8-flash";
