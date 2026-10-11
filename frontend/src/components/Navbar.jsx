import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useToast } from './Toast'

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
  const navigate = useNavigate()
  const profileRef = useRef(null)
  const { user, logout } = useUser()
  const showToast = useToast()
  
  const userRole = user?.role || localStorage.getItem('userRole') || 'student'
  const isHost = userRole === 'host'

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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

          {userRole === 'admin' && (
            <NavLink
              to="/cc-a-d-m-i-n"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 text-rose-800 font-headline text-xs font-semibold hover:bg-rose-100 transition-colors border border-rose-200"
            >
              <span className="material-symbols-outlined text-[15px] text-rose-600">shield_person</span>
              Admin Directorate
            </NavLink>
          )}

          <button
            aria-label="Notifications"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors relative"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-white" />
          </button>

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
                      {user?.name || 'Aarav Sharma'}
                    </p>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {userRole}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">
                    {user?.rollNo || user?.email || '22BCS10842'}
                  </p>
                </div>
                {userRole === 'admin' && (
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
              {userRole === 'admin' && (
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
