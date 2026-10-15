/**
 * Safe LocalStorage utilities with try/catch exception shielding.
 * Prevents application crashes from corrupted or malformed JSON data.
 */

export function safeGetItem(key, fallback = null) {
  try {
    const item = localStorage.getItem(key)
    if (!item) return fallback
    return JSON.parse(item)
  } catch (err) {
    console.warn(`[Storage Shield] Error reading key "${key}":`, err)
    return fallback
  }
}

export function safeSetItem(key, value) {
  try {
    const payload = typeof value === 'string' ? value : JSON.stringify(value)
    localStorage.setItem(key, payload)
    return true
  } catch (err) {
    console.warn(`[Storage Shield] Error writing key "${key}":`, err)
    return false
  }
}
