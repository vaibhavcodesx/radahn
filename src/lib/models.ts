/** Chat models offered in the composer picker. The server still falls back silently if one is busy. */
export const CHAT_MODELS = [
  { id: "gemini-3.6-flash", label: "3.6 Flash", hint: "Fast and steady" },
  { id: "gemini-3.8-flash", label: "3.8 Flash", hint: "Best answers, often busy" },
  { id: "gemini-3.5-flash-lite", label: "Flash-Lite", hint: "Fastest" },
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", hint: "Very fast, via Groq" },
  { id: "qwen/qwen3.8-27b", label: "Qwen 3.8", hint: "Fast, via Groq" },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];
export const DEFAULT_CHAT_MODEL: ChatModelId = "gemini-3.6-flash";
