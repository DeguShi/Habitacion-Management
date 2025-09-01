// app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { redirect } from "next/navigation";
import { isEmailAllowed } from "@/lib/allowlist";
import ClientShell from "@/app/(ui)/ClientShell";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const canWrite = isEmailAllowed(session.user?.email || null);
  return <ClientShell canWrite={canWrite} />;
}