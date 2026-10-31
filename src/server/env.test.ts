import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { parseEnv } = await import("./env");

const base = {
  MONGODB_URI: "mongodb+srv://example.invalid/radahn",
  GEMINI_API_KEYS: "key-one-aaaaaaaaaa, key-two-bbbbbbbbbb",
  BETTER_AUTH_SECRET: "x".repeat(32),
  CRON_SECRET: "y".repeat(32),
};

describe("parseEnv", () => {
  it("splits and trims the Gemini key pool", () => {
    expect(parseEnv(base).GEMINI_API_KEYS).toEqual(["key-one-aaaaaaaaaa", "key-two-bbbbbbbbbb"]);
  });

  it("names missing variables without echoing values", () => {
    expect(() => parseEnv({ ...base, MONGODB_URI: undefined })).toThrow(/MONGODB_URI/);
    try {
      parseEnv({ ...base, MONGODB_URI: undefined });
    } catch (e) {
      expect(String(e)).not.toContain("key-one");
    }
  });

  it("normalises a Google client id pasted as a URL", () => {
    const id = "123-abc.apps.googleusercontent.com";
    expect(parseEnv({ ...base, GOOGLE_CLIENT_ID: `http://${id}/
` }).GOOGLE_CLIENT_ID).toBe(id);
    expect(parseEnv({ ...base, GOOGLE_CLIENT_ID: id }).GOOGLE_CLIENT_ID).toBe(id);
  });

  it("falls back to placeholders when SKIP_ENV_VALIDATION=1", () => {
    expect(parseEnv({ SKIP_ENV_VALIDATION: "1" }).MEMORY_ENGINE).toBe("mock");
  });
});
