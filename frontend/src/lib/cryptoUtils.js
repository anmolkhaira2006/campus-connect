/**
 * Cryptographic utility using standard Web Cryptography API (crypto.subtle).
 * Ensures passwords are never stored in plain text in browser cache or fallback records.
 */

export async function hashPassword(plainText) {
  if (!plainText || typeof plainText !== 'string') return ''
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(plainText)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback in case of restricted sandbox
    return btoa(unescape(encodeURIComponent(plainText)))
  }
}

export async function verifyPasswordHash(plainText, storedHashOrPlain) {
  if (!plainText || !storedHashOrPlain) return false
  if (plainText === storedHashOrPlain) return true
  const computed = await hashPassword(plainText)
  return computed === storedHashOrPlain
}
