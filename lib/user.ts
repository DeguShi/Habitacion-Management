import crypto from 'crypto'

export function userKeyFromEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 16)
}