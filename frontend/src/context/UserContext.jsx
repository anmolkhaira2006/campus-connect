import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured, apiSignOut } from '../lib/supabase'

const UserContext = createContext(null)

const DEFAULT_USER = {
  name: 'Aarav Sharma',
  email: 'aarav@university.edu',
  role: 'student',
  branch: 'B.Tech Computer Science',
  year: "'26",
  sem: 'SEM 5',
  rollNo: '22BCS10842',
  avatar: null, // null = show initials fallback
}

export function UserProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true'
  })

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('userProfile')
      return stored ? { ...DEFAULT_USER, ...JSON.parse(stored) } : DEFAULT_USER
    } catch {
      return DEFAULT_USER
    }
  })

  const updateUser = (updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates }
      localStorage.setItem('userProfile', JSON.stringify(next))
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
    setUser(DEFAULT_USER)
    apiSignOut()
  }

  // Sync role from legacy localStorage key on first load
  useEffect(() => {
    const role = localStorage.getItem('userRole')
    if (role && role !== user.role) updateUser({ role })
  }, [])

  // Sync Supabase Auth session & OAuth redirects
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    // 1. Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsLoggedIn(true)
        localStorage.setItem('isLoggedIn', 'true')
        const meta = session.user.user_metadata || {}
        updateUser({
          id: session.user.id,
          email: session.user.email,
          name: meta.full_name || meta.name || session.user.email.split('@')[0],
          avatar: meta.avatar_url || meta.picture || null,
        })
      }
    })

    // 2. Listen for auth changes (e.g. redirected from Google OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
        setIsLoggedIn(true)
        localStorage.setItem('isLoggedIn', 'true')
        const meta = session.user.user_metadata || {}
        updateUser({
          id: session.user.id,
          email: session.user.email,
          name: meta.full_name || meta.name || session.user.email.split('@')[0],
          avatar: meta.avatar_url || meta.picture || null,
        })
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false)
        localStorage.removeItem('isLoggedIn')
        localStorage.removeItem('userProfile')
        setUser(DEFAULT_USER)
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
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
