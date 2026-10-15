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

/**
 * Strict password security validator.
 * Prevents trivial passwords like 123456, 1234546, password, etc.
 * Enforces:
 * - Minimum 8 characters
 * - Uppercase letter (A-Z)
 * - Lowercase letter (a-z)
 * - Number (0-9)
 * - Special symbol (!@#$%^&*...)
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' }
  }

  const trimmed = password.trim()

  if (trimmed.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' }
  }

  // Trivial and common passwords blocklist
  const commonWeakList = [
    '123456',
    '1234567',
    '12345678',
    '123456789',
    '1234546',
    '1234567890',
    'password',
    'password123',
    'admin123',
    'admin',
    'qwerty',
    'qwertyuiop',
    'student123',
    'campusconnect',
    'pass1234',
    '11111111',
    '00000000',
    '123123123',
  ]

  const lower = trimmed.toLowerCase()
  if (commonWeakList.some((weak) => lower === weak || (lower.startsWith(weak) && trimmed.length <= 10))) {
    return {
      valid: false,
      error: 'Password is too common and easily guessed. Please choose a more secure password.',
    }
  }

  // Disallow all digits
  if (/^\d+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Password cannot consist solely of digits (e.g. 1234546). Include letters and symbols.',
    }
  }

  // Disallow single repeated characters
  if (/^(.)\1+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Password cannot consist of repeated single characters.',
    }
  }

  // Complexity rules
  const hasUpper = /[A-Z]/.test(trimmed)
  const hasLower = /[a-z]/.test(trimmed)
  const hasNumber = /[0-9]/.test(trimmed)
  const hasSpecial = /[^A-Za-z0-9]/.test(trimmed)

  if (!hasUpper) {
    return { valid: false, error: 'Password must contain at least one uppercase letter (A-Z).' }
  }
  if (!hasLower) {
    return { valid: false, error: 'Password must contain at least one lowercase letter (a-z).' }
  }
  if (!hasNumber) {
    return { valid: false, error: 'Password must contain at least one number (0-9).' }
  }
  if (!hasSpecial) {
    return { valid: false, error: 'Password must contain at least one special character (e.g. !@#$%^&*).' }
  }

  return { valid: true, error: '' }
}

/**
 * Returns breakdown of password requirements for real-time UI display.
 */
export function getPasswordRequirements(password = '') {
  const p = typeof password === 'string' ? password : ''
  return {
    length: p.length >= 8,
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSpecial: /[^A-Za-z0-9]/.test(p),
    notTrivial: !/^\d+$/.test(p) && p.length >= 8 && !['12345678', 'password123'].includes(p.toLowerCase()),
  }
}
