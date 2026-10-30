import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  isAnonymous: boolean;
}

export async function getUser(): Promise<SessionUser | null> {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { isAnonymous?: boolean | null };
  return {
    id: u.id,
    name: u.isAnonymous ? "Guest" : u.name,
    email: u.email,
    image: u.image,
    isAnonymous: Boolean(u.isAnonymous),
  };
}

/** Server components / pages: redirect to /signin when signed out. */
export async function requirePageUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/signin");
  return user;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Route handlers: throw 401 (caught by `handle`). ownerId comes ONLY from here. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) throw new HttpError(401, "unauthorized", "Sign in to continue.");
  return user;
}
