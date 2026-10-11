import { NavLink } from 'react-router-dom'

const bottomLinks = [
  { to: '/events', icon: 'calendar_month', label: 'Events' },
  { to: '/passes', icon: 'confirmation_number', label: 'Passes' },
  { to: '/certificates', icon: 'workspace_premium', label: 'Certs' },
  { to: '/profile', icon: 'person', label: 'Profile' },
]

export default function MobileBottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 w-full z-50 bg-white border-t border-slate-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="h-16 px-4 flex items-center justify-around safe-area-bottom">
        {bottomLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-primary bg-primary-container/50'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                <span className={`text-[10px] mt-0.5 tracking-wider uppercase font-headline ${isActive ? 'font-bold' : 'font-semibold'}`}>
                  {link.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
