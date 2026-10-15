import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useToast } from './Toast'
import { isMasterAdmin, getActiveIdentityEmail, MASTER_ADMIN_EMAIL } from '../lib/adminAuth'
import { apiGetBroadcasts, subscribeToRealtime } from '../lib/supabase'

const navLinks = [
  { to: '/events', label: 'Events Discovery' },
  { to: '/passes', label: 'My Passes' },
  { to: '/certificates', label: 'Certificates Vault' },
  { to: '/profile', label: 'Profile & XP' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [broadcasts, setBroadcasts] = useState([])
  const [seenIds, setSeenIds] = useState([])
  const navigate = useNavigate()
  const profileRef = useRef(null)
  const notificationsRef = useRef(null)
  const { user, logout } = useUser()
  const showToast = useToast()
  
  const activeEmail = getActiveIdentityEmail(user)
  const userRole = user?.role || localStorage.getItem('userRole') || (activeEmail === MASTER_ADMIN_EMAIL ? 'admin' : 'student')
  const isHost = userRole === 'host'
  const isMaster = isMasterAdmin(user) || (activeEmail && activeEmail === MASTER_ADMIN_EMAIL)

  const loadBroadcastsData = async () => {
    try {
      const data = await apiGetBroadcasts()
      if (Array.isArray(data)) {
        setBroadcasts(data)
      }
    } catch {}

    try {
      const seen = JSON.parse(localStorage.getItem('seen_announcement_ids') || '[]')
      setSeenIds(Array.isArray(seen) ? seen : [])
    } catch {
      setSeenIds([])
    }
  }

  useEffect(() => {
    loadBroadcastsData()

    window.addEventListener('broadcast-updated', loadBroadcastsData)
    window.addEventListener('broadcast-read-status-changed', loadBroadcastsData)
    window.addEventListener('storage', loadBroadcastsData)
    const unsub = subscribeToRealtime('broadcasts', loadBroadcastsData)

    return () => {
      window.removeEventListener('broadcast-updated', loadBroadcastsData)
      window.removeEventListener('broadcast-read-status-changed', loadBroadcastsData)
      window.removeEventListener('storage', loadBroadcastsData)
      unsub()
    }
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unreadCount = broadcasts.filter(
    (b) => !seenIds.includes(String(b.id || b.subject))
  ).length

  const hasUltraUrgent = broadcasts.some(
    (b) =>
      !seenIds.includes(String(b.id || b.subject)) &&
      ((b.priority || '').toLowerCase().includes('ultra') || (b.priority || '').toLowerCase().includes('urgent'))
  )

  const handleMarkAllRead = () => {
    const allIds = broadcasts.map((b) => String(b.id || b.subject))
    const updatedSeen = Array.from(new Set([...seenIds, ...allIds]))
    setSeenIds(updatedSeen)
    try {
      localStorage.setItem('seen_announcement_ids', JSON.stringify(updatedSeen))
    } catch {}
    window.dispatchEvent(new Event('broadcast-read-status-changed'))
    showToast('All announcements marked as read')
  }

  const handleMarkSingleRead = (id) => {
    const targetId = String(id)
    if (seenIds.includes(targetId)) return
    const updated = [...seenIds, targetId]
    setSeenIds(updated)
    try {
      localStorage.setItem('seen_announcement_ids', JSON.stringify(updated))
    } catch {}
    window.dispatchEvent(new Event('broadcast-read-status-changed'))
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white border-b border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      <div className="h-16 lg:h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-4">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-on-primary text-[20px]">hub</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-bold text-sm tracking-tight text-on-surface">Campus Connect</span>
            <span className="hidden sm:block text-[10px] font-headline font-semibold text-on-surface-variant tracking-wide">Chandigarh University</span>
          </div>
        </NavLink>

        {/* Desktop Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (searchQuery.trim()) {
              navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`)
            }
          }}
          className="hidden md:flex flex-1 max-w-xs relative items-center"
        >
          <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[20px] pointer-events-none">search</span>
          <input
            className="w-full pl-10 pr-4 py-2 bg-slate-100 hover:bg-slate-100/90 focus:bg-white rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-slate-200 focus:border-primary/40"
            placeholder="Search events, clubs, talks..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `px-3 xl:px-4 py-2 rounded-lg font-headline text-xs xl:text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isHost && (
            <NavLink
              to="/host"
              className="hidden sm:inline-flex items-center px-3 py-2 rounded-lg bg-slate-100 text-slate-800 font-headline text-xs font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors border border-slate-200"
            >
              Host Console
            </NavLink>
          )}

          {isMaster && (
            <NavLink
              to="/cc-a-d-m-i-n"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 text-rose-800 font-headline text-xs font-semibold hover:bg-rose-100 transition-colors border border-rose-200"
            >
              <span className="material-symbols-outlined text-[15px] text-rose-600">shield_person</span>
              Admin Directorate
            </NavLink>
          )}

          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors relative cursor-pointer"
              title="Campus Announcements & Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {unreadCount > 0 && (
                <span
                  className={`absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full text-[9px] font-mono font-bold text-white flex items-center justify-center shadow-xs ${
                    hasUltraUrgent ? 'bg-rose-600 animate-pulse ring-2 ring-white' : 'bg-primary ring-2 ring-white'
                  }`}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 top-12 w-[340px] sm:w-[380px] bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-200/90 p-4 animate-scale-in z-[100] max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">campaign</span>
                    <h3 className="font-headline text-sm font-bold text-slate-900">
                      Notifications &amp; Alerts
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-100 text-rose-800">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-headline font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="flex flex-col gap-2.5 overflow-y-auto py-2 pr-1 max-h-[55vh]">
                  {broadcasts.length === 0 ? (
                    <div className="py-8 text-center flex flex-col items-center gap-2 text-slate-400">
                      <span className="material-symbols-outlined text-3xl">notifications_off</span>
                      <p className="text-xs">No notifications yet. You're all caught up!</p>
                    </div>
                  ) : (
                    broadcasts.map((b) => {
                      const isUnread = !seenIds.includes(String(b.id || b.subject))
                      const isUltra = (b.priority || '').toLowerCase().includes('ultra') || (b.priority || '').toLowerCase().includes('urgent')
                      const isPriority = (b.priority || '').toLowerCase().includes('priority')

                      return (
                        <div
                          key={b.id || b.subject}
                          onClick={() => handleMarkSingleRead(b.id || b.subject)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                            isUnread
                              ? isUltra
                                ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                                : 'bg-primary/5 border-primary/20 hover:border-primary/40'
                              : 'bg-white border-slate-100 hover:border-slate-200 opacity-80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-headline font-bold uppercase tracking-wider ${
                                  isUltra
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200 font-extrabold'
                                    : isPriority
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {b.priority || 'Normal Info'}
                              </span>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Unread" />
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {b.timestamp || new Date(b.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <h4 className="font-headline text-xs font-bold text-slate-900 leading-snug">
                            {b.subject}
                          </h4>

                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                            {b.message}
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100/60 text-[10px] text-slate-400">
                            <span>{b.sender || 'Campus Directorate'}</span>
                            {isUnread && <span className="text-primary font-semibold">Click to mark read</span>}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Footer Link */}
                {isMaster && (
                  <div className="pt-2 border-t border-slate-100 mt-auto">
                    <button
                      onClick={() => {
                        navigate('/cc-a-d-m-i-n')
                        setNotificationsOpen(false)
                      }}
                      className="w-full py-2 rounded-xl text-center text-xs font-headline font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Open Admin Dispatch Control
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                {profileOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
              </span>
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 w-60 bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 p-2 animate-scale-in z-[100]">
                <div className="px-3.5 py-3 bg-slate-50 border border-slate-100 rounded-xl mb-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-headline text-sm font-bold text-slate-900 truncate">
                      {user?.name || user?.email?.split('@')[0] || 'User Profile'}
                    </p>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {userRole}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">
                    {user?.rollNo ? `UID: ${user.rollNo}` : (user?.email || 'Student Account')}
                  </p>
                </div>
                {isMaster && (
                  <button
                    onClick={() => { navigate('/cc-a-d-m-i-n'); setProfileOpen(false) }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-2.5 cursor-pointer mb-1 border border-rose-100"
                  >
                    <span className="material-symbols-outlined text-[18px] text-rose-600">shield_person</span>
                    Admin Directorate Portal
                  </button>
                )}
                <button
                  onClick={() => { navigate('/profile'); setProfileOpen(false) }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-500">person</span>
                  My Profile & XP
                </button>
                <button
                  onClick={() => { navigate('/contact'); setProfileOpen(false) }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-500">mail</span>
                  Contact Support
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    logout()
                    showToast('Successfully signed out')
                    navigate('/')
                    setProfileOpen(false)
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-rose-500">logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="lg:hidden w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 shadow-2xl animate-slide-up">
          <div className="px-4 py-3">
            {/* Mobile Search */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (searchQuery.trim()) {
                  navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`)
                  setMobileOpen(false)
                }
              }}
              className="md:hidden relative mb-3"
            >
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">search</span>
              <input
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-200 focus:border-primary/40"
                placeholder="Search events, clubs, talks..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-xl font-headline text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-on-primary'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              {isHost && (
                <NavLink
                  to="/host"
                  onClick={() => setMobileOpen(false)}
                  className="sm:hidden px-4 py-3 rounded-xl font-headline text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">campaign</span>
                  Host Console
                </NavLink>
              )}
              {isMaster && (
                <NavLink
                  to="/cc-a-d-m-i-n"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl font-headline text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">shield_person</span>
                  Campus Directorate Admin
                </NavLink>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
