import { useState, useEffect } from 'react'
import { apiGetBroadcasts, subscribeToRealtime } from '../lib/supabase'

export default function AnnouncementModal({ isLoggedIn }) {
  const [activeAnnouncement, setActiveAnnouncement] = useState(null)
  const [countdown, setCountdown] = useState(3)
  const [canDismiss, setCanDismiss] = useState(false)

  const checkAnnouncements = async () => {
    if (!isLoggedIn) return
    try {
      const broadcasts = await apiGetBroadcasts()
      if (!Array.isArray(broadcasts) || broadcasts.length === 0) {
        return
      }

      let seenIds = []
      try {
        seenIds = JSON.parse(localStorage.getItem('seen_announcement_ids') || '[]')
      } catch {
        seenIds = []
      }

      // Find the most recent announcement that the user hasn't dismissed yet
      const unread = broadcasts.find(
        (b) => !seenIds.includes(String(b.id || b.subject))
      )

      if (unread) {
        setActiveAnnouncement(unread)

        // Set countdown based on priority
        // Ultra / Urgent: 5 seconds
        // Priority Alert: 4 seconds
        // Normal Info: 3 seconds
        const priorityStr = (unread.priority || '').toLowerCase()
        let requiredSeconds = 3
        if (priorityStr.includes('ultra') || priorityStr.includes('urgent')) {
          requiredSeconds = 5
        } else if (priorityStr.includes('priority')) {
          requiredSeconds = 4
        }

        setCountdown(requiredSeconds)
        setCanDismiss(false)
      }
    } catch (err) {
      console.warn('Failed to fetch announcements:', err)
    }
  }

  useEffect(() => {
    checkAnnouncements()

    window.addEventListener('broadcast-updated', checkAnnouncements)
    window.addEventListener('storage', checkAnnouncements)
    const unsub = subscribeToRealtime('broadcasts', checkAnnouncements)

    return () => {
      window.removeEventListener('broadcast-updated', checkAnnouncements)
      window.removeEventListener('storage', checkAnnouncements)
      unsub()
    }
  }, [isLoggedIn])

  // Countdown timer effect
  useEffect(() => {
    if (!activeAnnouncement) return

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setCanDismiss(true)
    }
  }, [countdown, activeAnnouncement])

  const handleDismiss = () => {
    if (!canDismiss || !activeAnnouncement) return

    try {
      const seenIds = JSON.parse(localStorage.getItem('seen_announcement_ids') || '[]')
      const targetId = String(activeAnnouncement.id || activeAnnouncement.subject)
      if (!seenIds.includes(targetId)) {
        localStorage.setItem('seen_announcement_ids', JSON.stringify([...seenIds, targetId]))
      }
    } catch {}

    window.dispatchEvent(new Event('broadcast-read-status-changed'))
    setActiveAnnouncement(null)
  }

  if (!activeAnnouncement) return null

  const isUltra = (activeAnnouncement.priority || '').toLowerCase().includes('ultra') || (activeAnnouncement.priority || '').toLowerCase().includes('urgent')
  const isPriority = (activeAnnouncement.priority || '').toLowerCase().includes('priority')

  const totalSeconds = isUltra ? 5 : isPriority ? 4 : 3
  const progressPercent = Math.min(100, Math.max(0, ((totalSeconds - countdown) / totalSeconds) * 100))

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div
        className={`relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border animate-scale-in flex flex-col ${
          isUltra ? 'border-rose-400 ring-4 ring-rose-500/20' : isPriority ? 'border-amber-400 ring-4 ring-amber-500/20' : 'border-slate-200'
        }`}
      >
        {/* Banner Top Strip */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white ${
            isUltra
              ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700'
              : isPriority
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
              : 'bg-gradient-to-r from-primary via-indigo-600 to-primary-dark'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <span className="material-symbols-outlined text-[22px]">
                {isUltra ? 'crisis_alert' : isPriority ? 'notification_important' : 'campaign'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/90 font-bold block">
                {isUltra ? 'Ultra Urgent Campus Alert' : isPriority ? 'Priority Campus Alert' : 'Campus Directorate Announcement'}
              </span>
              <h3 className="font-headline text-base font-bold text-white leading-tight">
                {activeAnnouncement.subject}
              </h3>
            </div>
          </div>

          <button
            type="button"
            disabled={!canDismiss}
            onClick={handleDismiss}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              canDismiss
                ? 'bg-white/20 hover:bg-white/30 text-white cursor-pointer'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
            title={canDismiss ? 'Close announcement' : `Close available in ${countdown}s`}
          >
            {canDismiss ? (
              <span className="material-symbols-outlined text-[18px]">close</span>
            ) : (
              <span className="font-mono text-xs font-bold">{countdown}s</span>
            )}
          </button>
        </div>

        {/* Real-time Reading Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-linear ${
              isUltra ? 'bg-rose-500' : isPriority ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 flex-wrap gap-2">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="material-symbols-outlined text-[15px] text-slate-400">account_circle</span>
              {activeAnnouncement.sender || 'Campus Directorate'}
            </span>
            <span className="font-mono text-[11px]">
              {activeAnnouncement.timestamp || new Date(activeAnnouncement.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-sm text-slate-800 leading-relaxed font-sans max-h-60 overflow-y-auto">
            {activeAnnouncement.message}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-headline font-bold uppercase tracking-wider ${
                  isUltra
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : isPriority
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}
              >
                {activeAnnouncement.priority || 'Normal Info'}
              </span>
              <span className="text-[11px] text-slate-400 italic">
                Saved in Notifications tab
              </span>
            </div>

            <button
              type="button"
              disabled={!canDismiss}
              onClick={handleDismiss}
              className={`px-5 py-2.5 rounded-xl font-headline text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                canDismiss
                  ? 'bg-slate-900 hover:bg-black text-white cursor-pointer active:scale-95 shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {canDismiss ? 'check_circle' : 'hourglass_top'}
              </span>
              <span>
                {canDismiss ? 'Acknowledge & Close' : `Please read (${countdown}s)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
