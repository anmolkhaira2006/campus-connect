import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured, apiSignOut, apiFindDatabaseUser } from '../lib/supabase'

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

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('userProfile')
      return stored ? { ...EMPTY_USER, ...JSON.parse(stored) } : EMPTY_USER
    } catch {
      return EMPTY_USER
    }
  })

  const updateUser = (updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates }
      localStorage.setItem('userProfile', JSON.stringify(next))
      if (next.role) localStorage.setItem('userRole', next.role)
      return next
    })
  }

  const setAvatar = (dataUrl) => updateUser({ avatar: dataUrl })

  const login = (userData = {}) => {
    setIsLoggedIn(true)
    localStorage.setItem('isLoggedIn', 'true')
    if (userData.role) localStorage.setItem('userRole', userData.role)
    updateUser(userData)
  }

  const logout = () => {
    setIsLoggedIn(false)
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userProfile')
    localStorage.removeItem('userRole')
    setUser(EMPTY_USER)
    apiSignOut()
  }

  // Sync role from localStorage key on first load
  useEffect(() => {
    const role = localStorage.getItem('userRole')
    if (role && role !== user.role) updateUser({ role })
  }, [])

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

      const hasPassword = Boolean(dbAccount?.password || meta.has_manual_password)

      updateUser({
        id: sessionUser.id,
        email: sessionUser.email,
        name: dbAccount?.name || profileRow?.name || meta.full_name || meta.name || sessionUser.email?.split('@')[0] || '',
        rollNo: dbAccount?.rollNo || profileRow?.roll_no || meta.rollNo || meta.roll_no || '',
        branch: dbAccount?.branch || profileRow?.branch || meta.branch || '',
        sem: dbAccount?.sem || profileRow?.sem || meta.sem || '',
        year: dbAccount?.year || profileRow?.year || meta.year || '',
        phone: dbAccount?.phone || meta.phone || '',
        role: dbAccount?.role || profileRow?.role || meta.role || localStorage.getItem('userRole') || 'student',
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
        syncSessionUser(session.user)
      }
    })

    // 2. Listen for auth changes (e.g. redirected from Google OAuth or user updated)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
        syncSessionUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false)
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
    <UserContext.Provider value={{ user, isLoggedIn, login, logout, updateUser, setAvatar }}>
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

