import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/5 p-8 sm:p-12 text-center flex flex-col items-center gap-6 relative overflow-hidden">
        {/* Decorative ambient gradient */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-rose-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* 404 Icon & Code */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-inner">
            <span className="material-symbols-outlined text-[42px] text-slate-500">
              link_off
            </span>
          </div>
          <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-rose-500 text-white font-mono text-[11px] font-bold shadow-xs">
            404
          </span>
        </div>

        {/* Text Details */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold">
            HTTP 404 // Resource Not Found
          </span>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            The requested page does not exist, has been decommissioned, or is not available on this server.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
          <Link
            to="/events"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-headline text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            <span>Explore Events</span>
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-headline text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Return Home</span>
          </Link>
        </div>

        {/* Sub text */}
        <p className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100 w-full">
          Campus Connect Core Router • Chandigarh University
        </p>
      </div>
    </div>
  )
}
