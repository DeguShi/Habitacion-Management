// lib/admin.ts
export function getAdminKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('adminKey') || ''
}

export async function ensureAdminKey(): Promise<string> {
  if (typeof window === 'undefined') return ''
  let key = localStorage.getItem('adminKey') || ''
  if (!key) {
    key = window.prompt('Digite a senha de administrador (ADMIN_KEY):', '') || ''
    if (key) localStorage.setItem('adminKey', key)
  }
  return key
}