import { useToast } from './Toast'
import { getEventRegistrationStats } from '../lib/eventUtils'

export default function EventDetailsModal({
  event,
  isOpen,
  onClose,
  onProceedToRegister,
  isBookmarked = false,
  onToggleBookmark,
}) {
  const showToast = useToast()

  if (!isOpen || !event) return null

  const handleToggle = () => {
    if (onToggleBookmark) {
      onToggleBookmark(event.id)
    } else {
      showToast(isBookmarked ? 'Bookmark removed' : 'Event saved to your bookmarks!')
    }
  }

  const categoryColorMap = {
    Hackathon: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Technical & Code': 'bg-blue-100 text-blue-700 border-blue-200',
    'Cultural & Arts': 'bg-pink-100 text-pink-700 border-pink-200',
    'Sports & Athletics': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Guest Keynotes': 'bg-purple-100 text-purple-700 border-purple-200',
    Masterclass: 'bg-amber-100 text-amber-700 border-amber-200',
    'Club Activity': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  }

  const badgeColor = categoryColorMap[event.category] || 'bg-slate-100 text-slate-700 border-slate-200'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 flex items-start sm:items-center justify-center bg-black/65 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-outline-variant overflow-hidden my-auto sm:my-8 flex flex-col max-h-[92vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner with Event Hero */}
        <div className="relative h-56 sm:h-64 w-full overflow-hidden shrink-0 bg-slate-900">
          <img
            src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&fit=crop'}
            alt={event.title}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

          {/* Top Actions on Banner */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-headline font-bold uppercase tracking-wider border backdrop-blur-md bg-white/90 ${badgeColor}`}>
                {event.category}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggle}
                className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all border cursor-pointer ${
                  isBookmarked
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/40'
                    : 'bg-black/50 hover:bg-black/70 text-white border-white/20'
                }`}
                title={isBookmarked ? 'Remove from Saved' : 'Save Event'}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isBookmarked ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {isBookmarked ? 'bookmark' : 'bookmark_border'}
                </span>
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-colors border border-white/20 cursor-pointer"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Event Title on Banner */}
          <div className="absolute bottom-4 left-5 right-5 text-white z-10">
            <div className="flex items-center gap-2 text-xs font-mono text-white/80 mb-1">
              <span>{event.organizer || 'Chandigarh University Official'}</span>
              <span>•</span>
              <span className="text-amber-300 font-semibold">{event.fee || 'FREE // CU ID'}</span>
            </div>
            <h2 className="font-headline text-xl sm:text-2xl lg:text-3xl font-extrabold leading-tight text-white drop-shadow-md">
              {event.title}
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">

          {/* Key Quick Facts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">calendar_month</span>
                Date
              </span>
              <span className="font-headline text-sm font-bold text-slate-900">
                {event.date || `${event.month} ${event.day}`}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                Time / Duration
              </span>
              <span className="font-headline text-sm font-bold text-slate-900">
                {event.time || event.duration || 'Full Day'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                Venue
              </span>
              <span className="font-headline text-sm font-bold text-slate-900 truncate" title={event.venue}>
                {event.venue}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">group</span>
                Eligibility
              </span>
              <span className="font-headline text-sm font-bold text-slate-900 truncate">
                {event.eligibility || 'All CU Branches'}
              </span>
            </div>
          </div>

          {/* Description Section */}
          <div className="flex flex-col gap-2">
            <h3 className="font-headline text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">info</span>
              About This Event
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {event.fullDescription || event.desc || event.description}
            </p>
          </div>

          {/* Highlights & Requirements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
              <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">checklist</span>
                What You Receive
              </h4>
              <ul className="text-xs text-slate-600 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                  Verified Digital Certificate in Vault
                </li>
                {event.hasTshirt && (
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                    Official Swag Kit & T-Shirt
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                  Campus Leaderboard & XP Points
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                  Direct Networking with Mentors & Industry Leaders
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
              <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">rule</span>
                Event Requirements
              </h4>
              <ul className="text-xs text-slate-600 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400 text-[16px]">badge</span>
                  Valid University Student ID Card
                </li>
                {event.allowTeams ? (
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">groups</span>
                    Solo or Teams (Up to {event.maxTeamSize || 4} Members)
                  </li>
                ) : (
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">person</span>
                    Individual Entry Only
                  </li>
                )}
                {event.hasTracks && (
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">category</span>
                    Select 1 Competition Track on Registration
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400 text-[16px]">qr_code_2</span>
                  Digital Pass Scan at Gate Entry
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Modal Footer with Register Action */}
        {(() => {
          const stats = getEventRegistrationStats(event)
          return (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                  Entry Status
                </span>
                <span className="font-headline text-sm font-bold text-slate-900">
                  {stats.isClosed ? (
                    <span className="text-rose-600">Registrations Closed ({stats.closeReason})</span>
                  ) : (
                    `${stats.registeredCount} / ${stats.capacity} Registered`
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 font-headline text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Back to Browse
                </button>
                {stats.isClosed ? (
                  <button
                    disabled
                    className="px-6 py-2.5 rounded-xl bg-slate-200 text-slate-500 font-headline text-xs font-bold flex items-center gap-2 cursor-not-allowed"
                  >
                    <span>Registrations Closed</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onClose()
                      onProceedToRegister(event)
                    }}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-headline text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Register for Event</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}
