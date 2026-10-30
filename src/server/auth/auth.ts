import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";
import { db, mongo } from "@/server/db/client";
import { env } from "@/server/env";
import { migrateOwner } from "./migrate";

/**
 * Better Auth (TRD §4): guest-first (anonymous plugin) + Google. When a guest signs in with
 * Google, onLinkAccount moves every guest-owned document to the Google user in one transaction,
 * so memories survive the upgrade (PRD F-02).
 */
function baseURL(): string {
  // Previews get their own origin; prod and local use BETTER_AUTH_URL.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return env().BETTER_AUTH_URL ?? "http://localhost:3000";
}

function createAuth() {
  const e = env();
  const google =
    e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET, prompt: "select_account" as const } }
      : undefined;

  return betterAuth({
    appName: "Radahn",
    baseURL: baseURL(),
    secret: e.BETTER_AUTH_SECRET,
    database: mongodbAdapter(db(), { client: mongo() }),
    socialProviders: google,
    trustedOrigins: [
      "http://localhost:3000",
      "https://radahn-ai.vercel.app",
      ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    plugins: [
      anonymous({
        emailDomainName: "guest.radahn.local",
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await migrateOwner(anonymousUser.user.id, newUser.user.id);
        },
      }),
      nextCookies(), // must stay last
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
const g = globalThis as unknown as { __radahnAuth?: Auth };

export function auth(): Auth {
  return (g.__radahnAuth ??= createAuth());
}
