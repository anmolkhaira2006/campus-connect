import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured, apiSignOut, apiFindDatabaseUser } from '../lib/supabase'
import { MASTER_ADMIN_EMAIL } from '../lib/adminAuth'

const UserContext = createContext(null)

export const EMPTY_USER = {
  id: null,
  name: '',
  email: '',
  role: 'student',
  branch: '',
  year: '',
  sem: '',
  rollNo: '',
  phone: '',
  avatar: null, // null = show initials fallback
  interests: [],
  isProfileSetup: false,
  hasPassword: false,
  password: '',
}

export function UserProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true'
  })

  const [isAuthLoading, setIsAuthLoading] = useState(() => {
    return Boolean(isSupabaseConfigured && (localStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('userRole')))
  })

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('userProfile')
      let parsed = stored ? { ...EMPTY_USER, ...JSON.parse(stored) } : { ...EMPTY_USER }

      // Synchronous fallback: If userProfile doesn't have email, inspect Supabase auth tokens in localStorage
      if (!parsed.email) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
            try {
              const sbToken = JSON.parse(localStorage.getItem(key) || '{}')
              const sbEmail = sbToken?.user?.email || sbToken?.currentSession?.user?.email
              if (sbEmail && typeof sbEmail === 'string' && sbEmail.trim()) {
                parsed.email = sbEmail.trim()
                if (parsed.email.toLowerCase() === MASTER_ADMIN_EMAIL) {
                  parsed.role = 'admin'
                }
                break
              }
            } catch {}
          }
        }
      }

      if (parsed.role === 'admin' && parsed.email?.toLowerCase().trim() !== MASTER_ADMIN_EMAIL) {
        parsed.role = 'student'
        localStorage.setItem('userRole', 'student')
        localStorage.setItem('userProfile', JSON.stringify(parsed))
      }
      return parsed
    } catch {
      return EMPTY_USER
    }
  })

  const updateUser = (updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates }
      // GOD-LEVEL SECURITY: Only MASTER_ADMIN_EMAIL can EVER hold the 'admin' role
      if (next.role === 'admin' && next.email?.toLowerCase().trim() !== MASTER_ADMIN_EMAIL) {
        next.role = 'student'
      }
      localStorage.setItem('userProfile', JSON.stringify(next))
      if (next.role) localStorage.setItem('userRole', next.role)
      return next
    })
  }

  const setAvatar = (dataUrl) => updateUser({ avatar: dataUrl })

  const login = (userData = {}) => {
    setIsLoggedIn(true)
    localStorage.setItem('isLoggedIn', 'true')
    const sanitized = { ...userData }
    if (sanitized.role === 'admin' && sanitized.email?.toLowerCase().trim() !== MASTER_ADMIN_EMAIL) {
      sanitized.role = 'student'
    }
    if (sanitized.role) localStorage.setItem('userRole', sanitized.role)
    updateUser(sanitized)
  }

  const logout = () => {
    setIsLoggedIn(false)
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userProfile')
    localStorage.removeItem('userRole')
    try {
      sessionStorage.removeItem('cc_admin_session_unlocked')
      sessionStorage.removeItem('cc_admin_session_time')
    } catch {}
    setUser(EMPTY_USER)
    apiSignOut()
  }

  // Ensure verified master admin is strictly recognized and prevent unauthenticated role escalation
  useEffect(() => {
    const isOwner = user?.email && user.email.toLowerCase().trim() === MASTER_ADMIN_EMAIL
    if (isOwner && user.role !== 'admin') {
      updateUser({ role: 'admin' })
    } else if (!isOwner && user?.role === 'admin') {
      // Force demote unauthorized admin spoofing immediately
      updateUser({ role: 'student' })
      localStorage.setItem('userRole', 'student')
    }
  }, [user?.email, user?.role])

  // Prevent localStorage tampering in other tabs/devtools
  useEffect(() => {
    const handleStorageChange = () => {
      const storedRole = localStorage.getItem('userRole')
      const email = user?.email?.toLowerCase().trim()
      if (storedRole === 'admin' && email !== MASTER_ADMIN_EMAIL) {
        localStorage.setItem('userRole', 'student')
        updateUser({ role: 'student' })
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [user?.email])

  // Sync Supabase Auth session & OAuth redirects
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const syncSessionUser = async (sessionUser) => {
      if (!sessionUser) return
      setIsLoggedIn(true)
      localStorage.setItem('isLoggedIn', 'true')
      const meta = sessionUser.user_metadata || {}

      // Query database account and profiles table to ensure complete data restoration
      let dbAccount = null
      let profileRow = null
      try {
        if (sessionUser.email) {
          dbAccount = await apiFindDatabaseUser(sessionUser.email)
        }
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle()
        profileRow = prof
      } catch {}

      const isOwner = sessionUser.email && sessionUser.email.toLowerCase().trim() === MASTER_ADMIN_EMAIL
      let assignedRole = isOwner ? 'admin' : (dbAccount?.role || profileRow?.role || meta.role || 'student')
      if (!isOwner && assignedRole === 'admin') {
        assignedRole = 'student'
      }

      updateUser({
        id: sessionUser.id,
        email: sessionUser.email,
        name: dbAccount?.name || profileRow?.name || meta.full_name || meta.name || sessionUser.email?.split('@')[0] || '',
        rollNo: dbAccount?.rollNo || profileRow?.roll_no || meta.rollNo || meta.roll_no || '',
        branch: dbAccount?.branch || profileRow?.branch || meta.branch || '',
        sem: dbAccount?.sem || profileRow?.sem || meta.sem || '',
        year: dbAccount?.year || profileRow?.year || meta.year || '',
        phone: dbAccount?.phone || meta.phone || '',
        role: assignedRole,
        avatar: profileRow?.avatar_url || meta.avatar_url || meta.avatar || meta.picture || null,
        interests: (dbAccount?.interests && dbAccount.interests.length > 0) ? dbAccount.interests : (Array.isArray(meta.interests) ? meta.interests : []),
        isProfileSetup: Boolean(dbAccount?.rollNo || profileRow?.roll_no || meta.isProfileSetup || meta.rollNo || meta.roll_no),
        hasPassword,
        password: dbAccount?.password || '',
      })
    }

    // 1. Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncSessionUser(session.user).finally(() => setIsAuthLoading(false))
      } else {
        setIsAuthLoading(false)
      }
    }).catch(() => {
      setIsAuthLoading(false)
    })

    // 2. Listen for auth changes (e.g. redirected from Google OAuth or user updated)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
        syncSessionUser(session.user).finally(() => setIsAuthLoading(false))
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false)
        setIsAuthLoading(false)
        localStorage.removeItem('isLoggedIn')
        localStorage.removeItem('userProfile')
        localStorage.removeItem('userRole')
        setUser(EMPTY_USER)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  return (
    <UserContext.Provider value={{ user, isLoggedIn, isAuthLoading, login, logout, updateUser, setAvatar }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>')
  return ctx
}

/** Returns initials (up to 2 chars) from a full name */
export function getInitials(name = '') {
  if (!name || typeof name !== 'string' || !name.trim()) return 'CU'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

