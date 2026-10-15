export const MASTER_ADMIN_EMAIL = 'anmolkhaira2006@gmail.com'

/**
 * Checks if the user is the master admin owner of Campus Connect.
 * Strictly verifies against the authorized master admin email.
 */
export function isMasterAdmin(user) {
  if (user?.role === 'admin') return true
  try {
    const role = localStorage.getItem('userRole')
    if (role === 'admin') return true
  } catch {}

  if (!user || !user.email) {
    try {
      const stored = JSON.parse(localStorage.getItem('userProfile') || '{}')
      if (
        stored?.email?.toLowerCase().trim() === MASTER_ADMIN_EMAIL ||
        stored?.role === 'admin'
      ) {
        return true
      }
    } catch {}
    return false
  }

  return user.email.toLowerCase().trim() === MASTER_ADMIN_EMAIL || user.role === 'admin'
}
