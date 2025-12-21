// app/v2/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { redirect } from "next/navigation";
import { isEmailAllowed } from "@/lib/allowlist";
import ClientShellV2 from "@/app/components/v2/ClientShellV2";

export default async function V2Page() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/sign-in");

    const canWrite = isEmailAllowed(session.user?.email || null);
    return <ClientShellV2 canWrite={canWrite} />;
}
