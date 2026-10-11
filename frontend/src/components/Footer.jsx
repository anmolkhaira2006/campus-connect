import { NavLink } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-outline-variant mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <NavLink to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[20px]">hub</span>
              </div>
              <span className="font-headline font-bold text-on-surface">Campus Connect</span>
            </NavLink>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Empowering Chandigarh University students with centralized events, validated passes, and experiential credentials.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-3">
            <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <NavLink to="/" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Home</NavLink>
              <NavLink to="/events" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Events Discovery</NavLink>
              <NavLink to="/passes" className="text-sm text-on-surface-variant hover:text-primary transition-colors">My Passes</NavLink>
              <NavLink to="/certificates" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Certificates Vault</NavLink>
              <NavLink to="/profile" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Profile & XP</NavLink>
              <NavLink to="/contact" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Contact Us</NavLink>
            </div>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-3">
            <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">Resources</h4>
            <div className="flex flex-col gap-2">
              <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">University Guidelines</a>
              <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Student Support</a>
              <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Privacy Statement</a>
              <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-on-surface-variant">© 2026 Campus Connect • Chandigarh University. All rights reserved.</p>
          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-tertiary text-[14px]">verified_user</span>
              <span>SSL Encrypted Gateway</span>
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
            </div>
            <span className="text-outline-variant">•</span>
            <NavLink to="/cc-a-d-m-i-n" className="text-on-surface-variant/50 hover:text-amber-600 flex items-center gap-1 transition-colors" title="Campus Connect Admin Portal">
              <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
              <span>Admin Portal</span>
            </NavLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
