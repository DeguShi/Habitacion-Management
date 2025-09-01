// lib/allowlist.ts
export function isEmailAllowed(email?: string | null): boolean {
  if (!email) return false;
  const raw = process.env.ALLOWED_EMAILS || "";
  const list = raw
    .split(/[,\s]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length > 0 && list.includes(email.toLowerCase());
}