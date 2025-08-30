// lib/user.ts
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";

/** Short, stable id for a user derived from their email */
export function userKeyFromEmail(email: string): string {
  return crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

/** Get the current user's storage key from the server session */
export async function requireUserIdFromSession(): Promise<string> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  return userKeyFromEmail(email);
}