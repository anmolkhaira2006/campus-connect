import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useToast } from './Toast'
import { apiBookPass, apiGetPasses } from '../lib/supabase'

export default function EventRegistrationModal({ event, isOpen, onClose, onViewDetails }) {
  const { user, isLoggedIn } = useUser()
  const navigate = useNavigate()
  const showToast = useToast()

  const [formData, setFormData] = useState({
    name: user?.name || '',
    rollNo: user?.rollNo || '',
    email: user?.email || '',
    phone: user?.phone || '',
    branch: user?.branch || '',
    semester: user?.sem || 'SEM 1',
    participationType: 'solo', // 'solo' or 'team'
    teamName: '',
    teamSize: '3',
    teamMembers: '',
    track: '',
    tshirtSize: 'L',
    dietary: 'Vegetarian',
    githubUrl: '',
    customAnswer: '',
    agreeGuidelines: true,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registeredPass, setRegisteredPass] = useState(null)

  useEffect(() => {
    if (user && event) {
      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name,
        rollNo: user.rollNo || prev.rollNo,
        email: user.email || prev.email,
        branch: user.branch || prev.branch,
        semester: user.sem || prev.semester,
        track: event.tracks?.[0] || 'General Open Track',
        participationType: 'solo',
        teamName: '',
        teamMembers: '',
        githubUrl: '',
        customAnswer: '',
      }))
    }
    setRegisteredPass(null)
  }, [event, user, isOpen])

  if (!isOpen || !event) return null

  // Ensure only logged-in users can register
  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/65 backdrop-blur-md animate-fade-in">
        <div className="w-full max-w-md p-6 bg-white rounded-3xl shadow-2xl border border-outline-variant text-center flex flex-col items-center gap-4 animate-scale-in my-auto">
          <div className="w-14 h-14 rounded-full bg-error-container text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">lock</span>
          </div>
          <div>
            <h3 className="font-headline text-xl font-bold text-on-surface">Login Required</h3>
            <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
              You must be logged in with your University account to register for events and claim official gate entry passes.
            </p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-outline-variant font-headline text-sm font-semibold text-on-surface hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClose()
                navigate('/')
              }}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white font-headline text-sm font-bold hover:bg-primary-dark transition-all shadow-md cursor-pointer"
            >
              Sign In Now
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.agreeGuidelines) {
      showToast('Please accept the event code of conduct')
      return
    }

    if (event.total && event.filled >= event.total) {
      showToast('Registration closed: This event has reached maximum seating capacity.')
      return
    }

    if (event.allowTeams && formData.participationType === 'team' && !formData.teamName.trim()) {
      showToast('Please provide your Team Name')
      return
    }

    if (event.githubRequired && !formData.githubUrl.trim()) {
      showToast('Please provide your GitHub / Portfolio link as required by the organizer')
      return
    }

    setIsSubmitting(true)

    // Check for existing pass to avoid double-registration
    try {
      const existingPasses = await apiGetPasses(user?.id)
      const userEmail = (formData.email || user?.email || '').toLowerCase().trim()
      const userRoll = (formData.rollNo || user?.rollNo || '').toLowerCase().trim()

      const isDuplicate = Array.isArray(existingPasses) && existingPasses.some((p) => {
        if (String(p.eventId) !== String(event.id)) return false
        const pEmail = (p.email || '').toLowerCase().trim()
        const pRoll = (p.rollNo || '').toLowerCase().trim()
        return (userEmail && pEmail === userEmail) || (userRoll && pRoll === userRoll)
      })

      if (isDuplicate) {
        setIsSubmitting(false)
        showToast('You are already registered for this event! Check "My Passes" to view your confirmed ticket.')
        return
      }
    } catch (checkErr) {
      console.warn('Pass validation notice:', checkErr)
    }

    setTimeout(async () => {
      setIsSubmitting(false)
      const passId = `PASS-CU-2026-${Math.floor(1000 + Math.random() * 9000)}`
      const newPass = {
        id: passId,
        eventId: event.id,
        eventTitle: event.title,
        category: event.category,
        date: event.date || `${event.month} ${event.day}`,
        venue: event.venue,
        time: event.time || event.duration || '09:30 AM',
        participantName: formData.name,
        rollNo: formData.rollNo,
        email: formData.email,
        phone: formData.phone,
        participationType: formData.participationType,
        teamName: formData.participationType === 'team' ? formData.teamName : null,
        track: event.hasTracks ? formData.track : null,
        tshirtSize: event.hasTshirt ? formData.tshirtSize : null,
        dietary: event.hasDietary ? formData.dietary : null,
        githubUrl: event.githubRequired ? formData.githubUrl : null,
        customAnswer: event.customQuestion ? formData.customAnswer : null,
        status: 'CONFIRMED',
        registeredAt: new Date().toISOString()
      }

      // Persist in Supabase backend (and localStorage fallback)
      try {
        await apiBookPass(newPass)
      } catch (err) {
        console.error(err)
      }

      setRegisteredPass(newPass)
      showToast(`Registration Confirmed! Gate Pass ${passId} generated.`)
    }, 1000)
  }

  // Check if organizer has ANY optional preferences enabled
  const hasOrganizerPreferences = 
    Boolean(event.allowTeams) || 
    Boolean(event.hasTracks) || 
    Boolean(event.hasTshirt) || 
    Boolean(event.hasDietary) || 
    Boolean(event.githubRequired) || 
    Boolean(event.customQuestion)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 flex items-start sm:items-center justify-center bg-black/65 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-outline-variant overflow-hidden my-auto sm:my-8 flex flex-col max-h-[92vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header (Properly padded, never clipped) */}
        <div className="px-6 py-4 bg-primary text-white flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-[22px]">how_to_reg</span>
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-white/80 font-bold block">
                Official Campus Registration
              </span>
              <h2 className="font-headline text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                {registeredPass ? 'Pass Generated Successfully!' : 'Event Entry & Registration Form'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/10 relative z-10 cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {registeredPass ? (
            /* Success / Pass State */
            <div className="flex flex-col items-center text-center gap-5 py-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[36px]">verified</span>
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-headline text-xs font-bold inline-block mb-2">
                  Registration Confirmed & Active
                </span>
                <h3 className="font-headline text-2xl font-bold text-on-surface">
                  You're all set for {event.title}!
                </h3>
                <p className="text-sm text-on-surface-variant max-w-md mx-auto mt-1 leading-relaxed">
                  Your scannable campus gate pass is ready. Present this QR pass at the venue entrance for seamless admission.
                </p>
              </div>

              {/* Pass Card Preview */}
              <div className="w-full max-w-md p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm text-left flex flex-col gap-3 relative">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider block">PASS CODE</span>
                    <span className="font-mono font-bold text-base text-on-surface">{registeredPass.id}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">
                    CONFIRMED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Attendee</span>
                    <strong className="text-slate-900 font-headline font-bold">{registeredPass.participantName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Roll / UID</span>
                    <strong className="text-slate-900 font-mono">{registeredPass.rollNo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date & Venue</span>
                    <strong className="text-slate-900">{registeredPass.date} • {registeredPass.venue}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Pass Status</span>
                    <strong className="text-emerald-700 font-bold">
                      ✓ Verified & Scannable
                    </strong>
                  </div>
                </div>

                {/* Scannable Barcode Mock */}
                <div className="pt-2 flex flex-col items-center gap-1 border-t border-slate-200">
                  <div className="flex items-center gap-1 h-8 opacity-80">
                    {[4, 2, 6, 3, 5, 2, 8, 3, 4, 2, 7, 3, 5, 2, 4, 6, 2, 5, 3].map((w, idx) => (
                      <div key={idx} className="bg-black h-full rounded-[1px]" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">TELEMETRY AUTHENTICATED SCANNER READY</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-2">
                <button
                  onClick={() => {
                    onClose()
                    navigate('/passes')
                  }}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-headline text-sm font-bold hover:bg-primary-dark transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                  View in My Passes
                </button>
                <button
                  onClick={onClose}
                  className="py-3 px-5 rounded-xl border border-slate-300 font-headline text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

              {/* Event Quick Info Banner with Details Switcher */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold font-headline">
                      {event.category}
                    </span>
                  </div>
                  <h4 className="font-headline text-base font-bold text-on-surface">
                    {event.title}
                  </h4>
                  <p className="text-xs text-on-surface-variant flex items-center gap-2 mt-0.5">
                    <span>{event.date || `${event.month} ${event.day}`}</span>
                    <span>•</span>
                    <span>{event.venue}</span>
                  </p>
                </div>

                <div className="flex items-center sm:flex-col items-end gap-2 shrink-0">
                  <span className="font-headline text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {event.fee || 'FREE // CU ID'}
                  </span>
                  {onViewDetails && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onViewDetails(event)
                      }}
                      className="text-xs font-headline font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">info</span>
                      View Event Details
                    </button>
                  )}
                </div>
              </div>

              {/* Section 1: University Credentials (Prefilled from active student profile) */}
              <div>
                <h5 className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
                  1. University Credentials
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-headline font-semibold text-on-surface-variant">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="e.g. John Doe"
                      className="px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-headline font-semibold text-on-surface-variant">Roll Number / UID *</label>
                    <input
                      type="text"
                      name="rollNo"
                      value={formData.rollNo}
                      onChange={handleChange}
                      required
                      placeholder="e.g. 24BCS1001"
                      className="px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-sm text-on-surface font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-headline font-semibold text-on-surface-variant">University Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="student@university.edu"
                      className="px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-headline font-semibold text-on-surface-variant">Contact / WhatsApp *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="e.g. 9876543210"
                      className="px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-headline font-semibold text-on-surface-variant">Department / Branch</label>
                    <input
                      type="text"
                      name="branch"
                      value={formData.branch}
                      onChange={handleChange}
                      placeholder="B.Tech Computer Science"
                      className="px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-headline font-semibold text-on-surface-variant">Semester / Year</label>
                    <input
                      type="text"
                      name="semester"
                      value={formData.semester}
                      onChange={handleChange}
                      placeholder="SEM 5"
                      className="px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Event-Specific Options (STRICTLY conditionally shown based on what the organizer configured!) */}
              {hasOrganizerPreferences && (
                <div>
                  <h5 className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
                    2. Organizer Preferences & Requirements
                  </h5>

                  <div className="flex flex-col gap-4">
                    {/* Solo vs Team (ONLY if event.allowTeams is true) */}
                    {event.allowTeams && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-headline font-semibold text-on-surface-variant">
                          Participation Type
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, participationType: 'solo' }))}
                            className={`py-2.5 px-4 rounded-xl border font-headline text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              formData.participationType === 'solo'
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-white text-on-surface-variant border-outline-variant hover:text-on-surface'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">person</span>
                            Individual / Solo
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, participationType: 'team' }))}
                            className={`py-2.5 px-4 rounded-xl border font-headline text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              formData.participationType === 'team'
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-white text-on-surface-variant border-outline-variant hover:text-on-surface'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">groups</span>
                            Team Entry
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Team Details (ONLY if Team is selected) */}
                    {event.allowTeams && formData.participationType === 'team' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 animate-fade-in">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-headline font-semibold text-on-surface-variant">Team Name *</label>
                          <input
                            type="text"
                            name="teamName"
                            value={formData.teamName}
                            onChange={handleChange}
                            placeholder="e.g. CyberVanguard"
                            required
                            className="px-3.5 py-2 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-headline font-semibold text-on-surface-variant">Team Members Count</label>
                          <select
                            name="teamSize"
                            value={formData.teamSize}
                            onChange={handleChange}
                            className="px-3.5 py-2 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:border-primary"
                          >
                            <option value="2">2 Members</option>
                            <option value="3">3 Members</option>
                            <option value="4">4 Members</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2 flex flex-col gap-1.5">
                          <label className="text-xs font-headline font-semibold text-on-surface-variant">
                            Member Roll Numbers / UIDs (Comma separated)
                          </label>
                          <input
                            type="text"
                            name="teamMembers"
                            value={formData.teamMembers}
                            onChange={handleChange}
                            placeholder="e.g. 24BCS1002, 24BCS1003"
                            className="px-3.5 py-2 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    )}

                    {/* Focus Domain / Track (ONLY if event.hasTracks is true) */}
                    {event.hasTracks && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-headline font-semibold text-on-surface-variant">
                          Focus Domain / Track *
                        </label>
                        <select
                          name="track"
                          value={formData.track}
                          onChange={handleChange}
                          className="px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          {(event.tracks && event.tracks.length > 0) ? (
                            event.tracks.map((tr) => (
                              <option key={tr} value={tr}>{tr}</option>
                            ))
                          ) : (
                            <>
                              <option value="AI / Intelligent Systems">AI & Generative Agents</option>
                              <option value="Full-Stack Web3">Full-Stack & Distributed Systems</option>
                              <option value="Robotics & IoT">Embedded Robotics & IoT</option>
                              <option value="Open Track">Open Innovation Track</option>
                            </>
                          )}
                        </select>
                      </div>
                    )}

                    {/* Participant Kit / T-Shirt Size (ONLY if event.hasTshirt is true) */}
                    {event.hasTshirt && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-headline font-semibold text-on-surface-variant">
                          Participant Kit / T-Shirt Size
                        </label>
                        <select
                          name="tshirtSize"
                          value={formData.tshirtSize}
                          onChange={handleChange}
                          className="px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="S">S (Small)</option>
                          <option value="M">M (Medium)</option>
                          <option value="L">L (Large)</option>
                          <option value="XL">XL (Extra Large)</option>
                          <option value="XXL">XXL</option>
                        </select>
                      </div>
                    )}

                    {/* Meal / Dietary Preference (ONLY if event.hasDietary is true) */}
                    {event.hasDietary && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-headline font-semibold text-on-surface-variant">
                          Meal & Refreshment Preference
                        </label>
                        <select
                          name="dietary"
                          value={formData.dietary}
                          onChange={handleChange}
                          className="px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="Vegetarian">Standard Vegetarian</option>
                          <option value="Non-Vegetarian">Non-Vegetarian</option>
                          <option value="Jain">Jain / No Onion-Garlic</option>
                        </select>
                      </div>
                    )}

                    {/* GitHub / Portfolio URL (ONLY if event.githubRequired is true) */}
                    {event.githubRequired && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-headline font-semibold text-on-surface-variant">
                          GitHub / Project Portfolio Link *
                        </label>
                        <input
                          type="url"
                          name="githubUrl"
                          value={formData.githubUrl}
                          onChange={handleChange}
                          required
                          placeholder="https://github.com/username or https://portfolio.dev"
                          className="px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    )}

                    {/* Custom Organizer Question (ONLY if event.customQuestion is configured) */}
                    {event.customQuestion && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-headline font-semibold text-on-surface-variant">
                          {event.customQuestion}
                        </label>
                        <input
                          type="text"
                          name="customAnswer"
                          value={formData.customAnswer}
                          onChange={handleChange}
                          placeholder="Enter your response..."
                          className="px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Code of Conduct Agreement */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agreeGuidelines"
                  name="agreeGuidelines"
                  checked={formData.agreeGuidelines}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <label htmlFor="agreeGuidelines" className="text-xs text-on-surface-variant cursor-pointer select-none">
                  I agree to abide by the university campus code of conduct and confirm all credentials entered are authentic.
                </label>
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 font-headline text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-7 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-headline text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generating Gate Pass...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Registration</span>
                      <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
