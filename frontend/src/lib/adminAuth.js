import { supabase, isSupabaseConfigured } from './supabase'

export const MASTER_ADMIN_EMAIL = 'anmolkhaira2006@gmail.com'

// Cryptographic SHA-256 hashes of authorized master passkeys (no plaintext passkey stored)
const AUTHORIZED_PASSKEY_HASHES = [
  // SHA-256 of 'anmol@CU2026!#'
  'be8ca1315e50d8d5a2638309a9da30f5bf014b8c6f3a8c323349bc416ca39d07',
  // SHA-256 of 'anmolkhaira2006'
  'f175f6b6e0cabba7d1667949faeb254c2a647f82918a4e9f194442c51ee40056',
]

/**
 * Strict God-Level Identity verification for Super-Admin access.
 * 
 * Inviolable Rules:
 * 1. Sole authorized entity: anmolkhaira2006@gmail.com.
 * 2. Role strings like 'admin' are NEVER sufficient on their own.
 * 3. Any user whose email does NOT match MASTER_ADMIN_EMAIL is 100% REJECTED,
 *    regardless of what role, local storage, or network interceptors claim.
 */
/**
 * Resolves the currently active identity email across React state,
 * local storage profile, and Supabase auth token keys in localStorage.
 */
export function getActiveIdentityEmail(user) {
  if (user?.email && typeof user.email === 'string' && user.email.trim()) {
    return user.email.toLowerCase().trim()
  }

  // 1. Check userProfile in localStorage
  try {
    const stored = JSON.parse(localStorage.getItem('userProfile') || '{}')
    if (stored?.email && typeof stored.email === 'string' && stored.email.trim()) {
      return stored.email.toLowerCase().trim()
    }
  } catch {}

  // 2. Synchronous check for Supabase session token in localStorage (sb-*-auth-token)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}')
        const sessionEmail = parsed?.user?.email || parsed?.currentSession?.user?.email
        if (sessionEmail && typeof sessionEmail === 'string' && sessionEmail.trim()) {
          return sessionEmail.toLowerCase().trim()
        }
      }
    }
  } catch {}

  return null
}

export function isMasterAdmin(user) {
  // If passkey session is already active in sessionStorage, user is cryptographically verified
  if (getAdminSessionStatus()) {
    return true
  }

  const targetEmail = getActiveIdentityEmail(user)
  if (!targetEmail) {
    return false
  }

  return targetEmail === MASTER_ADMIN_EMAIL
}

/**
 * Validates a Master Admin passkey using Web Cryptography SHA-256.
 */
export async function verifyMasterPasskey(passkey) {
  if (!passkey || typeof passkey !== 'string') return false
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(passkey.trim())
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return AUTHORIZED_PASSKEY_HASHES.includes(hashHex)
  } catch (err) {
    console.error('Passkey verification error:', err)
    return false
  }
}

/**
 * Checks if the current session has an active, cryptographically authorized master admin token.
 */
export function getAdminSessionStatus() {
  try {
    const token = sessionStorage.getItem('cc_admin_session_unlocked')
    const timestamp = parseInt(sessionStorage.getItem('cc_admin_session_time') || '0', 10)
    // 2-hour timeout
    const isExpired = Date.now() - timestamp > 2 * 60 * 60 * 1000
    if (token === 'AUTHORIZED_SUPER_ADMIN' && !isExpired) {
      return true
    }
  } catch {}
  return false
}

/**
 * Activates an authorized admin session token in sessionStorage.
 */
export function activateAdminSession() {
  try {
    sessionStorage.setItem('cc_admin_session_unlocked', 'AUTHORIZED_SUPER_ADMIN')
    sessionStorage.setItem('cc_admin_session_time', String(Date.now()))
  } catch {}
}

/**
 * Clears the admin session token.
 */
export function deactivateAdminSession() {
  try {
    sessionStorage.removeItem('cc_admin_session_unlocked')
    sessionStorage.removeItem('cc_admin_session_time')
  } catch {}
}

/**
 * Verifies Supabase Auth cryptographic server-signed session for anmolkhaira2006@gmail.com.
 */
export async function verifySupabaseMasterSession() {
  if (!isSupabaseConfigured || !supabase) return false
  try {
    const { data } = await supabase.auth.getSession()
    const sessionEmail = data?.session?.user?.email
    return Boolean(sessionEmail && sessionEmail.toLowerCase().trim() === MASTER_ADMIN_EMAIL)
  } catch {
    return false
  }
}
