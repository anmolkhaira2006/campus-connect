import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { useUser } from '../context/UserContext'
import {
  apiGetEvents,
  apiSaveEvent,
  apiDeleteEvent,
  apiToggleFlagship,
  apiGetPasses,
  apiUpdatePassStatus,
  apiRevokePass,
  apiCancelRegistration,
  apiGetBroadcasts,
  apiSendBroadcast,
  apiSignInWithGoogle,
  subscribeToRealtime,
} from '../lib/supabase'
import { validateImageFile } from '../lib/imageValidator'
import {
  isMasterAdmin,
  getActiveIdentityEmail,
  verifyMasterPasskey,
  getAdminSessionStatus,
  activateAdminSession,
  deactivateAdminSession,
  MASTER_ADMIN_EMAIL,
} from '../lib/adminAuth'
import { getEventRegistrationStats } from '../lib/eventUtils'
import NotFound from './NotFound'

export default function CcAdmin() {
  const showToast = useToast()
  const { user, updateUser } = useUser()
  const activeEmail = getActiveIdentityEmail(user)
  const isMaster = isMasterAdmin(user) || (activeEmail && activeEmail === MASTER_ADMIN_EMAIL)

  const [isSessionUnlocked, setIsSessionUnlocked] = useState(() => getAdminSessionStatus())
  const [passkeyInput, setPasskeyInput] = useState('')
  const [showPasskey, setShowPasskey] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLockedOut, setIsLockedOut] = useState(false)

  const [activeTab, setActiveTab] = useState('events') // 'events' | 'attendees' | 'broadcast' | 'roles'
  const [eventSearch, setEventSearch] = useState('')
  const [eventCategoryFilter, setEventCategoryFilter] = useState('all')

  // Flagship Events State (Admin Only Control)
  const [flagshipIds, setFlagshipIds] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('flagship_event_ids') || '[]')
      if (Array.isArray(stored)) return stored
    } catch {
      // fallback
    }
    return []
  })

  // Events State
  const [hostedEvents, setHostedEvents] = useState([])
  const [deletedIds, setDeletedIds] = useState([])
  const [editingEvent, setEditingEvent] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState(null)
  const [newEventForm, setNewEventForm] = useState({
    title: '',
    category: 'Technical & Code',
    venue: 'Apex Block Tech Arena',
    date: '2026-11-20',
    time: '10:00 AM',
    capacity: '200',
    organizer: 'CU Central Directorate',
    description: '',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&fit=crop',
    allowTeams: true,
    minTeamSize: 2,
    maxTeamSize: 4,
    isFlagship: false,
  })

  // Attendees State
  const [attendees, setAttendees] = useState([])
  const [attendeeQuery, setAttendeeQuery] = useState('')
  const [attendeeEventFilter, setAttendeeEventFilter] = useState('all')

  // Broadcasts State
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastPriority, setBroadcastPriority] = useState('Normal Info')
  const [broadcasts, setBroadcasts] = useState([])

  // Load state from Supabase with fallback to local storage
  const loadSystemState = async () => {
    try {
      const eventsFromApi = await apiGetEvents()
      if (Array.isArray(eventsFromApi)) {
        setHostedEvents(eventsFromApi)
        const activeFlagships = eventsFromApi.filter((ev) => ev.isFlagship).map((ev) => ev.id)
        if (activeFlagships.length > 0) {
          setFlagshipIds(activeFlagships)
        }
      } else {
        const storedHosted = JSON.parse(localStorage.getItem('hosted_events') || '[]')
        setHostedEvents(Array.isArray(storedHosted) ? storedHosted : [])
      }
    } catch {
      setHostedEvents([])
    }

    try {
      const storedDeleted = JSON.parse(localStorage.getItem('deleted_event_ids') || '[]')
      setDeletedIds(Array.isArray(storedDeleted) ? storedDeleted : [])
    } catch {
      setDeletedIds([])
    }

    try {
      const storedFlagship = JSON.parse(localStorage.getItem('flagship_event_ids') || '[]')
      if (Array.isArray(storedFlagship)) {
        setFlagshipIds(storedFlagship)
      } else {
        setFlagshipIds([])
      }
    } catch {
      setFlagshipIds([])
    }

    try {
      const passesFromApi = await apiGetPasses()
      if (Array.isArray(passesFromApi)) {
        setAttendees(passesFromApi)
      } else {
        const storedPasses = JSON.parse(localStorage.getItem('user_registered_passes') || '[]')
        setAttendees(Array.isArray(storedPasses) ? storedPasses : [])
      }
    } catch {
      setAttendees([])
    }

    try {
      const dbBroadcasts = await apiGetBroadcasts()
      if (Array.isArray(dbBroadcasts) && dbBroadcasts.length > 0) {
        setBroadcasts(dbBroadcasts)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!isMaster || !isSessionUnlocked) return
    loadSystemState()
    const handleSync = () => {
      loadSystemState()
    }
    window.addEventListener('event-updated', handleSync)
    window.addEventListener('broadcast-updated', handleSync)
    window.addEventListener('storage', handleSync)

    const unsubEvents = subscribeToRealtime('events', handleSync)
    const unsubPasses = subscribeToRealtime('passes', handleSync)
    const unsubBroadcasts = subscribeToRealtime('broadcasts', handleSync)

    return () => {
      window.removeEventListener('event-updated', handleSync)
      window.removeEventListener('broadcast-updated', handleSync)
      window.removeEventListener('storage', handleSync)
      unsubEvents()
      unsubPasses()
      unsubBroadcasts()
    }
  }, [isMaster, isSessionUnlocked])

  // Toggle Flagship Status (Admin Exclusive)
  const isFlagship = (eventId) => {
    return flagshipIds.some((id) => String(id) === String(eventId))
  }

  const handleToggleFlagship = async (eventId, eventTitle) => {
    const currentlyFlagship = isFlagship(eventId)
    const nextFlagshipState = !currentlyFlagship
    let updatedFlagships
    if (nextFlagshipState) {
      updatedFlagships = [...new Set([...flagshipIds, eventId])]
    } else {
      updatedFlagships = flagshipIds.filter((id) => String(id) !== String(eventId))
    }
    setFlagshipIds(updatedFlagships)
    try {
      localStorage.setItem('flagship_event_ids', JSON.stringify(updatedFlagships))
    } catch {}

    setHostedEvents((prev) =>
      prev.map((e) => (String(e.id) === String(eventId) ? { ...e, isFlagship: nextFlagshipState, is_flagship: nextFlagshipState } : e))
    )

    await apiToggleFlagship(eventId, nextFlagshipState)
    showToast(
      nextFlagshipState
        ? `Event "${eventTitle}" promoted to Flagship Carousel!`
        : `Event "${eventTitle}" removed from Flagship carousel`
    )
  }

  // All active system events excluding deleted ones
  const allSystemEvents = useMemo(() => {
    return hostedEvents.filter((ev) => !deletedIds.includes(ev.id))
  }, [hostedEvents, deletedIds])

  // Delete Any Event
  const handleDeleteEvent = async (eventId, eventTitle) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${eventTitle}" from the entire system?`)) {
      return
    }

    const updatedHosted = hostedEvents.filter((ev) => String(ev.id) !== String(eventId))
    setHostedEvents(updatedHosted)

    const updatedDeleted = [...new Set([...deletedIds, eventId])]
    setDeletedIds(updatedDeleted)

    if (flagshipIds.includes(eventId)) {
      setFlagshipIds(flagshipIds.filter((id) => id !== eventId))
    }

    await apiDeleteEvent(eventId)
    showToast(`Event "${eventTitle}" deleted from system`)
  }

  // Clear Event Deletion Filters
  const handleRestoreDefaults = async () => {
    if (!window.confirm('Clear all event deletion filters?')) return
    setDeletedIds([])
    localStorage.removeItem('deleted_event_ids')
    window.dispatchEvent(new Event('event-updated'))
    window.dispatchEvent(new Event('storage'))
    showToast('Filters cleared!')
  }

  // Handle Event Image Upload with max 60KB and extension validation
  const handleAdminEventImageUpload = (e, isEdit = false) => {
    const file = e.target.files?.[0]
    if (file) {
      const check = validateImageFile(file)
      if (!check.valid) {
        showToast(check.error)
        e.target.value = ''
        return
      }
      const reader = new FileReader()
      reader.onload = (uploadEvent) => {
        if (isEdit) {
          setEditingEvent((prev) => ({ ...prev, image: uploadEvent.target.result, image_url: uploadEvent.target.result }))
        } else {
          setNewEventForm((prev) => ({ ...prev, image: uploadEvent.target.result }))
        }
        showToast(`Event banner attached (${check.sizeKb} KB)`)
      }
      reader.readAsDataURL(file)
    }
  }

  // Host New Event as Admin
  const handleCreateEvent = async (e) => {
    e.preventDefault()
    if (!newEventForm.title.trim()) {
      showToast('Event title is required')
      return
    }

    let monthStr = 'NOV'
    let dayStr = '20'
    let formattedDate = newEventForm.date
    if (newEventForm.date) {
      const parsed = new Date(newEventForm.date)
      if (!isNaN(parsed.getTime())) {
        monthStr = parsed.toLocaleString('en-US', { month: 'short' }).toUpperCase()
        dayStr = String(parsed.getDate()).padStart(2, '0')
        formattedDate = `${parsed.toLocaleString('en-US', { month: 'short' })} ${parsed.getDate()}, ${parsed.getFullYear()}`
      }
    }

    const created = {
      id: Date.now(),
      title: newEventForm.title.trim(),
      category: newEventForm.category,
      venue: newEventForm.venue,
      date: formattedDate,
      month: monthStr,
      day: dayStr,
      time: newEventForm.time || '10:00 AM',
      filled: 0,
      total: Number(newEventForm.capacity) || 200,
      desc: newEventForm.description,
      fullDescription: newEventForm.description,
      organizer: newEventForm.organizer || 'CU Central Directorate',
      image: newEventForm.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&fit=crop',
      allowTeams: Boolean(newEventForm.allowTeams),
      minTeamSize: Number(newEventForm.minTeamSize) || 2,
      maxTeamSize: Number(newEventForm.maxTeamSize) || 4,
      isFlagship: Boolean(newEventForm.isFlagship),
      origin: 'hosted',
    }

    if (newEventForm.isFlagship) {
      const nextFlagships = [...flagshipIds, created.id]
      setFlagshipIds(nextFlagships)
    }

    const updated = [created, ...hostedEvents]
    setHostedEvents(updated)

    await apiSaveEvent(created)
    if (newEventForm.isFlagship) {
      await apiToggleFlagship(created.id, true)
    }

    setIsCreateModalOpen(false)
    setNewEventForm({
      title: '',
      category: 'Technical & Code',
      venue: 'Apex Block Tech Arena',
      date: '2026-11-20',
      time: '10:00 AM',
      capacity: '200',
      organizer: 'CU Central Directorate',
      description: '',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&fit=crop',
      allowTeams: true,
      minTeamSize: 2,
      maxTeamSize: 4,
      isFlagship: false,
    })
    showToast(`Event "${created.title}" published live!${newEventForm.isFlagship ? ' (Promoted to Flagship Carousel)' : ''}`)
  }

  // Edit Event Submit
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingEvent) return

    const existsInHosted = hostedEvents.some((ev) => String(ev.id) === String(editingEvent.id))
    const updatedHosted = existsInHosted
      ? hostedEvents.map((ev) => (String(ev.id) === String(editingEvent.id) ? { ...ev, ...editingEvent } : ev))
      : [{ ...editingEvent, origin: 'hosted' }, ...hostedEvents]

    setHostedEvents(updatedHosted)
    await apiSaveEvent(editingEvent)

    setEditingEvent(null)
    showToast(`Event "${editingEvent.title}" updated successfully!`)
  }

  // Toggle Attendee Check-In
  const handleToggleAttendeeCheckIn = async (passId) => {
    const current = attendees.find((a) => a.id === passId)
    const newStatus = current?.status === 'CHECKED_IN' ? 'CONFIRMED' : 'CHECKED_IN'

    const updated = attendees.map((att) => {
      if (att.id === passId) {
        return {
          ...att,
          status: newStatus,
        }
      }
      return att
    })
    setAttendees(updated)
    await apiUpdatePassStatus(passId, newStatus)
    showToast('Check-in status toggled')
  }

  // Cancel Attendee Registration (Individual Student or Entire Team)
  const handleCancelRegistration = async (attendee, cancelTeam = false) => {
    const isTeam = cancelTeam && attendee.teamName
    const targetLabel = isTeam
      ? `entire team "${attendee.teamName}" for event "${attendee.eventTitle}"`
      : `registration for "${attendee.participantName}" (${attendee.eventTitle})`

    if (!window.confirm(`Are you sure you want to cancel ${targetLabel}? This will free up seating capacity in the event.`)) {
      return
    }

    try {
      await apiCancelRegistration(attendee.id, {
        cancelTeam,
        teamName: attendee.teamName,
        eventId: attendee.eventId,
      })

      // Update local state
      setAttendees((prev) =>
        prev.map((a) => {
          const isTarget = isTeam && attendee.eventId
            ? String(a.eventId) === String(attendee.eventId) &&
              a.teamName &&
              String(a.teamName).toLowerCase().trim() === String(attendee.teamName).toLowerCase().trim()
            : String(a.id) === String(attendee.id)
          return isTarget ? { ...a, status: 'CANCELLED' } : a
        })
      )

      showToast(`Registration cancelled for ${isTeam ? `team "${attendee.teamName}"` : attendee.participantName}`)
    } catch (err) {
      console.error(err)
      showToast('Failed to cancel registration')
    }
  }

  // Revoke / Delete Attendee Pass
  const handleDeleteAttendee = async (passId, participantName, eventId) => {
    if (!window.confirm(`Revoke pass ${passId} for ${participantName}?`)) return
    const updated = attendees.filter((a) => a.id !== passId)
    setAttendees(updated)
    await apiRevokePass(passId, eventId)
    showToast(`Pass ${passId} revoked`)
  }

  // Export Master CSV
  const handleExportMasterCSV = () => {
    const headers = ['Pass ID', 'Student Name', 'Roll No', 'Email', 'Phone', 'Event', 'Type', 'Team', 'Track', 'Status', 'Registered At']
    const rows = attendees.map((a) => [
      `"${a.id || ''}"`,
      `"${a.participantName || ''}"`,
      `"${a.rollNo || ''}"`,
      `"${a.email || ''}"`,
      `"${a.phone || ''}"`,
      `"${a.eventTitle || ''}"`,
      `"${a.participationType || 'solo'}"`,
      `"${a.teamName || 'N/A'}"`,
      `"${a.track || 'General'}"`,
      `"${a.status || 'CONFIRMED'}"`,
      `"${a.registeredAt || ''}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `CU_MASTER_REGISTRATIONS_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Master registration database exported as CSV')
  }

  // Dispatch System Broadcast
  const handleSendBroadcast = async (e) => {
    e.preventDefault()
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      showToast('Please provide subject and broadcast message')
      return
    }

    const newBroadcast = {
      id: Date.now(),
      subject: broadcastSubject.trim(),
      message: broadcastMessage.trim(),
      priority: broadcastPriority,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'Super-Admin Console (cc-a-d-m-i-n)',
    }
    setBroadcasts([newBroadcast, ...broadcasts])
    setBroadcastSubject('')
    setBroadcastMessage('')
    await apiSendBroadcast(newBroadcast)
    showToast(`Global broadcast transmitted across all campus channels!`)
  }

  // Cryptographic Master Passkey Authorization
  const handleAuthorizePasskey = async (e) => {
    e.preventDefault()
    if (isLockedOut) {
      setAuthError('Too many failed attempts. Console locked for 5 minutes.')
      return
    }
    if (!passkeyInput.trim()) {
      setAuthError('Please enter the Master Admin Passkey.')
      return
    }

    setIsVerifying(true)
    setAuthError('')
    try {
      const isValid = await verifyMasterPasskey(passkeyInput.trim())
      if (isValid) {
        activateAdminSession()
        setIsSessionUnlocked(true)
        setPasskeyInput('')
        setFailedAttempts(0)
        // Ensure user is recognized as master admin in state and storage
        updateUser({ email: MASTER_ADMIN_EMAIL, role: 'admin' })
        localStorage.setItem('userRole', 'admin')
        try {
          const currentProfile = JSON.parse(localStorage.getItem('userProfile') || '{}')
          localStorage.setItem('userProfile', JSON.stringify({ ...currentProfile, email: MASTER_ADMIN_EMAIL, role: 'admin' }))
        } catch {}
        showToast('Super-Admin Root Console Unlocked (Session Active: 2h)')
      } else {
        const nextAttempts = failedAttempts + 1
        setFailedAttempts(nextAttempts)
        if (nextAttempts >= 5) {
          setIsLockedOut(true)
          setAuthError('Exceeded maximum authorization attempts. Console locked for 5 minutes.')
          setTimeout(() => {
            setIsLockedOut(false)
            setFailedAttempts(0)
          }, 5 * 60 * 1000)
        } else {
          setAuthError(`Invalid Passkey. ${5 - nextAttempts} attempt(s) remaining before security lockout.`)
        }
      }
    } catch {
      setAuthError('Verification error encountered. Please retry.')
    } finally {
      setIsVerifying(false)
    }
  }

  // Lock Console Immediately
  const handleLockConsole = () => {
    deactivateAdminSession()
    setIsSessionUnlocked(false)
    setPasskeyInput('')
    setAuthError('')
    showToast('Super-Admin Console Locked')
  }

  // Switch Role
  const handleSetUserRole = (targetRole) => {
    updateUser({ role: targetRole })
    localStorage.setItem('userRole', targetRole)
    showToast(`Active account role set to: ${targetRole.toUpperCase()}`)
  }

  // -------------------------------------------------------------
  // RENDER: ACCESS CONTROL (Strict 404 for other authenticated students/hosts)
  // -------------------------------------------------------------
  if (activeEmail && activeEmail !== MASTER_ADMIN_EMAIL) {
    return <NotFound />
  }

  // -------------------------------------------------------------
  // RENDER: MASTER SECURITY SHIELD (Passkey Authorization Required)
  // -------------------------------------------------------------
  if (!isSessionUnlocked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl animate-fade-in text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Security Shield Header */}
          <div className="flex flex-col items-center text-center gap-3 relative z-10">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-[32px]">shield_person</span>
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-mono font-bold uppercase tracking-wider mx-auto">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Restricted Superuser Portal</span>
              </div>
              <h2 className="font-headline text-2xl font-bold tracking-tight text-white mt-1">
                Root Admin Gateway
              </h2>
              <p className="text-xs text-slate-400 max-w-xs">
                Chandigarh University Central Directorate & Super-Admin Console Access.
              </p>
            </div>
          </div>

          {/* Identity Verification Card */}
          <div className="mt-6 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3 relative z-10">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Authorized Master Identity
              </div>
              <div className="text-xs font-mono font-semibold text-white truncate">
                {MASTER_ADMIN_EMAIL}
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
              MATCHED
            </span>
          </div>

          {/* Passkey Input Form */}
          <form onSubmit={handleAuthorizePasskey} className="mt-6 flex flex-col gap-4 relative z-10">
            <div>
              <label className="block text-xs font-headline font-semibold text-slate-300 mb-1.5">
                Master Security Passkey
              </label>
              <div className="relative">
                <input
                  type={showPasskey ? 'text' : 'password'}
                  value={passkeyInput}
                  onChange={(e) => {
                    setPasskeyInput(e.target.value)
                    if (authError) setAuthError('')
                  }}
                  disabled={isLockedOut || isVerifying}
                  placeholder="Enter authorized passkey..."
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 pl-10 pr-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
                  autoFocus
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                  key
                </span>
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPasskey ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs animate-shake">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLockedOut || isVerifying}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-dark hover:to-indigo-700 text-white font-headline text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Verifying SHA-256 Digest...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">lock_open</span>
                  <span>Authorize Root Console</span>
                </>
              )}
            </button>

            <div className="relative flex items-center justify-center my-0.5">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider shrink-0">
                OR MASTER GOOGLE SSO
              </span>
            </div>

            <button
              type="button"
              onClick={async () => {
                showToast('Connecting to Google Single Sign-On...')
                await apiSignInWithGoogle()
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-headline text-xs font-semibold flex items-center justify-center gap-2.5 border border-slate-700 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Verify via Google ({MASTER_ADMIN_EMAIL})</span>
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <Link
                to="/events"
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Exit to Events</span>
              </Link>
              <span className="text-[11px] font-mono text-slate-500">
                AES/SHA-256 HARDENED
              </span>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // RENDER: SUPER-ADMIN COMMAND CENTER (Direct Access for Owner)
  // -------------------------------------------------------------
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in pb-24 lg:pb-8 flex flex-col gap-6">
      
      {/* Top Admin Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[26px]">terminal</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline text-xl sm:text-2xl font-extrabold tracking-tight">
                cc-a-d-m-i-n
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                ROOT SUPERUSER
              </span>
            </div>
            <p className="text-xs text-white/70 mt-0.5">
              Full control room to create, modify, or delete any event, attendee, or permission.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-center z-10 flex-wrap">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-headline font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Host New Event</span>
          </button>
          <button
            onClick={handleLockConsole}
            className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-headline font-semibold flex items-center gap-1.5 border border-rose-500/30 transition-all cursor-pointer"
            title="Lock Console & Require Passkey"
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Lock Console</span>
          </button>
          <Link
            to="/events"
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-headline font-semibold flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>View Events</span>
          </Link>
        </div>
      </div>

      {/* Metric Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-1">
          <span className="text-[10px] font-headline uppercase font-bold text-slate-500">Total Live Events</span>
          <span className="font-mono text-2xl font-bold text-slate-900">{allSystemEvents.length}</span>
          <span className="text-[10px] text-emerald-600 font-semibold">{hostedEvents.length} Custom Hosted</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-1">
          <span className="text-[10px] font-headline uppercase font-bold text-slate-500">Student Passes</span>
          <span className="font-mono text-2xl font-bold text-slate-900">{attendees.length}</span>
          <span className="text-[10px] text-primary font-semibold">Active in Roster</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-1">
          <span className="text-[10px] font-headline uppercase font-bold text-slate-500">Checked In</span>
          <span className="font-mono text-2xl font-bold text-emerald-600">
            {attendees.filter((a) => a.status === 'CHECKED_IN').length}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">Verified at Gate</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-1">
          <span className="text-[10px] font-headline uppercase font-bold text-slate-500">Deleted / Purged</span>
          <span className="font-mono text-2xl font-bold text-rose-600">{deletedIds.length}</span>
          <button
            onClick={handleRestoreDefaults}
            disabled={deletedIds.length === 0}
            className="text-[10px] text-slate-600 hover:text-slate-900 font-bold underline text-left disabled:opacity-40 cursor-pointer"
          >
            Restore Default Events
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200/80">
        {[
          { id: 'events', label: 'Events Control Room', icon: 'event' },
          { id: 'attendees', label: 'Master Attendee Roster', icon: 'groups' },
          { id: 'broadcast', label: 'System Broadcast Engine', icon: 'podcasts' },
          { id: 'roles', label: 'Roles & Privileges', icon: 'manage_accounts' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl font-headline text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: EVENTS CONTROL ROOM (Delete, Host, or Edit ANY Event)   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'events' && (
        <div className="flex flex-col gap-4 animate-slide-up">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search any event by title, venue, or organizer..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={eventCategoryFilter}
                onChange={(e) => setEventCategoryFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-headline font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="Technical & Code">Technical & Code</option>
                <option value="Hackathons & Sprints">Hackathons & Sprints</option>
                <option value="Cultural & Arts">Cultural & Arts</option>
                <option value="Sports & Athletics">Sports & Athletics</option>
                <option value="Guest Keynotes">Guest Keynotes</option>
              </select>

              <button
                type="button"
                onClick={() => setEventCategoryFilter(eventCategoryFilter === 'flagship_only' ? 'all' : 'flagship_only')}
                className={`px-3 py-2.5 rounded-xl border text-xs font-headline font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  eventCategoryFilter === 'flagship_only'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">stars</span>
                <span>Flagship Only ({allSystemEvents.filter((e) => isFlagship(e.id)).length})</span>
              </button>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-headline font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Host Event</span>
              </button>
            </div>
          </div>

          {/* Master Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allSystemEvents
              .filter((ev) => {
                const q = eventSearch.toLowerCase().trim()
                const matchesSearch =
                  !q ||
                  String(ev.title || '').toLowerCase().includes(q) ||
                  String(ev.category || '').toLowerCase().includes(q) ||
                  String(ev.venue || '').toLowerCase().includes(q) ||
                  String(ev.organizer || '').toLowerCase().includes(q)
                const matchesCat =
                  eventCategoryFilter === 'all'
                    ? true
                    : eventCategoryFilter === 'flagship_only'
                    ? isFlagship(ev.id)
                    : ev.category === eventCategoryFilter
                return matchesSearch && matchesCat
              })
              .map((event) => (
                <div
                  key={event.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-headline font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {event.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">ID: {event.id}</span>
                        {isFlagship(event.id) && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-headline bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-xs">
                            <span className="material-symbols-outlined text-[12px] text-amber-600">stars</span>
                            FLAGSHIP SUMMIT
                          </span>
                        )}
                        {event.origin === 'hosted' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            Custom Hosted
                          </span>
                        )}
                      </div>
                      <h3 className="font-headline text-base font-bold text-slate-900 leading-snug">
                        {event.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                        {event.desc || event.description}
                      </p>
                    </div>

                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                  </div>

                  {/* Real Registration Telemetry Bar (No Fake Data) */}
                  {(() => {
                    const stats = getEventRegistrationStats(event, attendees)
                    return (
                      <div className="flex flex-col gap-1.5 py-1 px-1 bg-slate-50/70 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-xs px-1">
                          <span className="font-mono text-slate-700 font-semibold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-primary">groups</span>
                            <span>{stats.registeredCount} / {stats.capacity} Registered</span>
                          </span>
                          {stats.isClosed ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-headline font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                              Closed ({stats.closeReason})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-headline font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Open
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${stats.isClosed ? 'bg-slate-400' : 'bg-primary'}`}
                            style={{ width: `${Math.min(100, (stats.registeredCount / stats.capacity) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })()}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <span className="material-symbols-outlined text-[14px] text-slate-400">calendar_month</span>
                        {event.date}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <span className="material-symbols-outlined text-[14px] text-slate-400">location_on</span>
                        {event.venue}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View Registered Students Modal Trigger */}
                      <button
                        onClick={() => setSelectedEventForAttendees(event)}
                        className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-headline font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="View student registrations and team details for this event"
                      >
                        <span className="material-symbols-outlined text-[15px]">badge</span>
                        <span>Students ({getEventRegistrationStats(event, attendees).registeredCount})</span>
                      </button>

                      {/* Flagship Toggle Button (Admin Exclusive) */}
                      <button
                        onClick={() => handleToggleFlagship(event.id, event.title)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-headline font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          isFlagship(event.id)
                            ? 'bg-amber-500 text-white shadow-xs hover:bg-amber-600'
                            : 'bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 border border-slate-200'
                        }`}
                        title={
                          isFlagship(event.id)
                            ? 'Flagship Active: Shown in top 3D carousel. Click to demote.'
                            : 'Make Flagship: Promote this event to the top 3D carousel.'
                        }
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {isFlagship(event.id) ? 'stars' : 'star_border'}
                        </span>
                        <span>{isFlagship(event.id) ? 'Flagship' : 'Make Flagship'}</span>
                      </button>

                      <button
                        onClick={() => setEditingEvent(event)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-headline font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Edit event details"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteEvent(event.id, event.title)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-headline font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Delete event from whole website"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {allSystemEvents.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center gap-3 bg-white rounded-3xl border border-slate-200">
              <span className="material-symbols-outlined text-4xl text-slate-300">event_busy</span>
              <h4 className="font-headline text-base font-bold text-slate-900">No Events Found</h4>
              <p className="text-xs text-slate-500">All events were deleted or none match your filter.</p>
              <button
                onClick={handleRestoreDefaults}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold font-headline cursor-pointer"
              >
                Restore Default Events
              </button>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: MASTER ATTENDEE ROSTER                                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'attendees' && (
        <div className="flex flex-col gap-4 animate-slide-up">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search by student name, roll number, pass ID, team, or email..."
                value={attendeeQuery}
                onChange={(e) => setAttendeeQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={attendeeEventFilter}
                onChange={(e) => setAttendeeEventFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-headline font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">All Events ({attendees.length})</option>
                {allSystemEvents.map((ev) => {
                  const evCount = attendees.filter((a) => (String(a.eventId) === String(ev.id) || a.eventTitle === ev.title) && a.status !== 'CANCELLED').length
                  return (
                    <option key={ev.id} value={String(ev.id)}>
                      {ev.title} ({evCount})
                    </option>
                  )
                })}
              </select>

              <button
                onClick={handleExportMasterCSV}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-headline font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Export Master CSV</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {attendees
              .filter((a) => {
                const q = attendeeQuery.toLowerCase().trim()
                const matchesSearch =
                  !q ||
                  String(a.participantName || '').toLowerCase().includes(q) ||
                  String(a.rollNo || '').toLowerCase().includes(q) ||
                  String(a.id || '').toLowerCase().includes(q) ||
                  String(a.eventTitle || '').toLowerCase().includes(q) ||
                  String(a.email || '').toLowerCase().includes(q) ||
                  String(a.teamName || '').toLowerCase().includes(q) ||
                  String(a.phone || '').toLowerCase().includes(q)

                const matchesEvent =
                  attendeeEventFilter === 'all' ||
                  String(a.eventId) === String(attendeeEventFilter) ||
                  (allSystemEvents.find((e) => String(e.id) === String(attendeeEventFilter))?.title === a.eventTitle)

                return matchesSearch && matchesEvent
              })
              .map((att) => (
                <div
                  key={att.id}
                  className={`p-4 rounded-2xl bg-white border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all ${
                    att.status === 'CANCELLED' ? 'border-rose-200 bg-rose-50/20 opacity-80' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-headline text-sm font-bold text-slate-900">
                        {att.participantName}
                      </h4>
                      {att.rollNo && (
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          UID: {att.rollNo}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-slate-400">Pass: {att.id}</span>
                      
                      {att.status === 'CANCELLED' ? (
                        <span className="text-[10px] font-headline font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          Cancelled
                        </span>
                      ) : att.status === 'CHECKED_IN' ? (
                        <span className="text-[10px] font-headline font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Checked In
                        </span>
                      ) : (
                        <span className="text-[10px] font-headline font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          Confirmed
                        </span>
                      )}

                      <span className={`text-[10px] font-headline font-semibold px-2 py-0.5 rounded ${
                        att.participationType === 'team' || att.teamName ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {att.participationType === 'team' || att.teamName ? 'Team Entry' : 'Solo Entry'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-700">{att.eventTitle}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                      <span>Email: {att.email || 'N/A'}</span>
                      {att.phone && <span>Phone: {att.phone}</span>}
                      {att.teamName && (
                        <span className="text-primary font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">groups</span>
                          Team: {att.teamName}
                        </span>
                      )}
                      {att.track && <span>Track: {att.track}</span>}
                      {att.tshirtSize && <span>Size: {att.tshirtSize}</span>}
                      {att.dietaryPref && <span>Diet: {att.dietaryPref}</span>}
                      {att.registeredAt && <span>Reg: {new Date(att.registeredAt).toLocaleDateString()}</span>}
                    </div>

                    {att.customAnswer && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-slate-700">Answer: </span>
                        {typeof att.customAnswer === 'object' ? JSON.stringify(att.customAnswer) : String(att.customAnswer)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                    {/* Toggle Check In */}
                    {att.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleToggleAttendeeCheckIn(att.id)}
                        className={`px-3 py-1.5 rounded-xl font-headline text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          att.status === 'CHECKED_IN'
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-primary hover:bg-primary-dark text-white shadow-xs'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {att.status === 'CHECKED_IN' ? 'undo' : 'qr_code_scanner'}
                        </span>
                        <span>{att.status === 'CHECKED_IN' ? 'Undo Check-in' : 'Check In'}</span>
                      </button>
                    )}

                    {/* Cancel Registration Options */}
                    {att.status === 'CANCELLED' ? (
                      <span className="text-xs text-rose-500 font-headline font-semibold italic px-2">
                        Cancelled
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleCancelRegistration(att, false)}
                          className="px-2.5 py-1.5 rounded-xl font-headline text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                          title="Cancel this student's registration"
                        >
                          Cancel Reg
                        </button>
                        {att.teamName && (
                          <button
                            onClick={() => handleCancelRegistration(att, true)}
                            className="px-2.5 py-1.5 rounded-xl font-headline text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-2xs"
                            title={`Cancel entire team "${att.teamName}"`}
                          >
                            Cancel Team
                          </button>
                        )}
                      </>
                    )}

                    {/* Permanent Delete */}
                    <button
                      onClick={() => handleDeleteAttendee(att.id, att.participantName, att.eventId)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Permanently remove pass from system"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: SYSTEM BROADCAST ENGINE                                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'broadcast' && (
        <div className="flex flex-col gap-4 animate-slide-up">
          <form
            onSubmit={handleSendBroadcast}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3.5"
          >
            <div>
              <h3 className="font-headline text-sm font-bold text-slate-900">Transmit Campus Broadcast</h3>
              <p className="text-xs text-slate-500">
                Pushes system-wide announcement across all students, faculty, and host consoles.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-headline font-bold text-slate-700">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Update / Tech Summit Venue Change"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-headline font-bold text-slate-700">Priority Level</label>
                <select
                  value={broadcastPriority}
                  onChange={(e) => setBroadcastPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="Normal Info">Normal Info (3s Display)</option>
                  <option value="Priority Alert">Priority Alert (4s Display)</option>
                  <option value="Ultra Urgent">Ultra Urgent (5s Display)</option>
                  <option value="Urgent Directive">Urgent Directive (5s Display)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-headline font-bold text-slate-700">Broadcast Message</label>
              <textarea
                rows={3}
                required
                placeholder="Enter announcement text to be broadcasted to all active portals..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              <span>Transmit Global Announcement</span>
            </button>
          </form>

          {broadcasts.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                Broadcast Dispatch Log ({broadcasts.length})
              </h4>
              {broadcasts.map((b) => {
                const isUltra = b.priority?.toLowerCase().includes('ultra') || b.priority?.toLowerCase().includes('urgent')
                const isPriority = b.priority?.toLowerCase().includes('priority') || b.priority?.toLowerCase().includes('alert')
                return (
                  <div key={b.id} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-headline text-xs font-bold text-slate-900">{b.subject}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isUltra
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isPriority
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {b.priority || 'Normal Info'} ({isUltra ? '5s lock' : isPriority ? '4s lock' : '3s lock'})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{b.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{b.message}</p>
                    {b.sender && (
                      <div className="text-[10px] text-slate-400 font-medium">
                        Dispatched by: <span className="text-slate-600 font-semibold">{b.sender}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: ROLES & PRIVILEGES MANAGER                              */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'roles' && (
        <div className="flex flex-col gap-4 animate-slide-up">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-4">
            <div>
              <h3 className="font-headline text-sm font-bold text-slate-900">Current Session Privileges</h3>
              <p className="text-xs text-slate-500">
                You can switch your active identity to preview how the website behaves for different campus roles.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleSetUserRole('admin')}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  user?.role === 'admin'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-700 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">terminal</span>
                <span className="font-headline text-xs font-bold">Admin (Root)</span>
                <span className="text-[10px] text-center text-slate-500">Can delete or host any event</span>
              </button>

              <button
                onClick={() => handleSetUserRole('host')}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  user?.role === 'host'
                    ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">campaign</span>
                <span className="font-headline text-xs font-bold">Club Host / Organizer</span>
                <span className="text-[10px] text-center text-slate-500">Can access Host Console</span>
              </button>

              <button
                onClick={() => handleSetUserRole('student')}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  user?.role === 'student'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">school</span>
                <span className="font-headline text-xs font-bold">Student</span>
                <span className="text-[10px] text-center text-slate-500">Standard attendee access</span>
              </button>
            </div>
          </div>

          {/* Admin Identity Status Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                </div>
                <div>
                  <h3 className="font-headline text-sm font-bold text-slate-900">
                    Master Administrator Identity
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    anmolkhaira2006@gmail.com
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ACTIVE ROOT
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2.5">
              Passcode gate removed. Root access is granted automatically to your verified Google Account (<span className="font-semibold text-slate-700">anmolkhaira2006@gmail.com</span>). All other users and hosts visiting <span className="font-mono text-slate-700">/cc-a-d-m-i-n</span> receive a 404 Page Not Found.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: HOST / CREATE EVENT AS ADMIN                           */}
      {/* ------------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 flex flex-col gap-4 animate-scale-in my-auto relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                </div>
                <div>
                  <h3 className="font-headline text-base font-bold text-slate-900">Host New Event as Admin</h3>
                  <p className="text-xs text-slate-500">Publishes live to the campus event directory</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-headline font-bold text-slate-700">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Cyber Olympiad 2026"
                  value={newEventForm.title}
                  onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-headline font-bold text-slate-700">Category</label>
                  <select
                    value={newEventForm.category}
                    onChange={(e) => setNewEventForm({ ...newEventForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Technical & Code">Technical & Code</option>
                    <option value="Hackathons & Sprints">Hackathons & Sprints</option>
                    <option value="Cultural & Arts">Cultural & Arts</option>
                    <option value="Sports & Athletics">Sports & Athletics</option>
                    <option value="Guest Keynotes">Guest Keynotes</option>
                    <option value="Departmental Research">Departmental Research</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-headline font-bold text-slate-700">Venue</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Block Tech Arena"
                    value={newEventForm.venue}
                    onChange={(e) => setNewEventForm({ ...newEventForm, venue: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-headline font-bold text-slate-700">Event Date</label>
                  <input
                    type="date"
                    value={newEventForm.date}
                    onChange={(e) => setNewEventForm({ ...newEventForm, date: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-headline font-bold text-slate-700">Time</label>
                  <input
                    type="text"
                    placeholder="10:00 AM"
                    value={newEventForm.time}
                    onChange={(e) => setNewEventForm({ ...newEventForm, time: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-headline font-bold text-slate-700">Seat Capacity</label>
                  <input
                    type="number"
                    value={newEventForm.capacity}
                    onChange={(e) => setNewEventForm({ ...newEventForm, capacity: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-headline font-bold text-slate-700">Organizer / Club</label>
                <input
                  type="text"
                  placeholder="e.g. Department of Computer Science"
                  value={newEventForm.organizer}
                  onChange={(e) => setNewEventForm({ ...newEventForm, organizer: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-headline font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">add_photo_alternate</span>
                    Event Poster / Cover (Max 60 KB)
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">.jpg, .png, .webp, .svg &le; 60KB</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {newEventForm.image && (
                    <img
                      src={newEventForm.image}
                      alt="Banner Preview"
                      className="w-14 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  )}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={(e) => handleAdminEventImageUpload(e, false)}
                    className="text-xs file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-headline font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of event schedule and activities..."
                  value={newEventForm.description}
                  onChange={(e) => setNewEventForm({ ...newEventForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                <input
                  type="checkbox"
                  id="createEventFlagship"
                  checked={newEventForm.isFlagship || false}
                  onChange={(e) => setNewEventForm({ ...newEventForm, isFlagship: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="createEventFlagship" className="text-xs font-headline font-bold text-amber-950 cursor-pointer flex items-center gap-1.5 select-none">
                  <span className="material-symbols-outlined text-amber-600 text-[18px]">hotel_class</span>
                  <span>Feature as Flagship Summit (Displays in top 3D carousel for all students)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-headline font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-headline font-bold shadow-md cursor-pointer"
                >
                  Publish Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT EXISTING EVENT                                    */}
      {/* ------------------------------------------------------------- */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 flex flex-col gap-4 animate-scale-in my-auto relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-headline text-base font-bold text-slate-900">Edit Event</h3>
              <button
                onClick={() => setEditingEvent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-headline font-bold text-slate-700">Event Title</label>
                <input
                  type="text"
                  required
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-headline font-bold text-slate-700">Venue</label>
                  <input
                    type="text"
                    value={editingEvent.venue}
                    onChange={(e) => setEditingEvent({ ...editingEvent, venue: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-headline font-bold text-slate-700">Date Display</label>
                  <input
                    type="text"
                    value={editingEvent.date}
                    onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-headline font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">add_photo_alternate</span>
                    Event Poster / Cover (Max 60 KB)
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">.jpg, .png, .webp, .svg &le; 60KB</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {(editingEvent.image || editingEvent.image_url) && (
                    <img
                      src={editingEvent.image || editingEvent.image_url}
                      alt="Banner Preview"
                      className="w-14 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  )}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={(e) => handleAdminEventImageUpload(e, true)}
                    className="text-xs file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                <input
                  type="checkbox"
                  id="editEventFlagship"
                  checked={isFlagship(editingEvent.id)}
                  onChange={() => handleToggleFlagship(editingEvent.id, editingEvent.title)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="editEventFlagship" className="text-xs font-headline font-bold text-amber-950 cursor-pointer flex items-center gap-1.5 select-none">
                  <span className="material-symbols-outlined text-amber-600 text-[18px]">hotel_class</span>
                  <span>Feature as Flagship Summit (Displays in top 3D carousel)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-headline font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-headline font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: VIEW REGISTERED STUDENTS & TEAMS FOR SPECIFIC EVENT    */}
      {/* ------------------------------------------------------------- */}
      {selectedEventForAttendees && (() => {
        const eventStats = getEventRegistrationStats(selectedEventForAttendees, attendees)
        const eventPasses = attendees.filter((a) =>
          (String(a.eventId) === String(selectedEventForAttendees.id) || a.eventTitle === selectedEventForAttendees.title)
        )
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 animate-scale-in max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-headline font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                      {selectedEventForAttendees.category || 'Event'}
                    </span>
                    <span className="font-mono text-xs text-slate-400">ID: {selectedEventForAttendees.id}</span>
                    {eventStats.isClosed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-headline font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                        Registrations Closed ({eventStats.closeReason})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-headline font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Registrations Open
                      </span>
                    )}
                  </div>
                  <h3 className="font-headline text-xl font-bold text-slate-900">
                    {selectedEventForAttendees.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-slate-400">calendar_month</span>
                      {selectedEventForAttendees.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-slate-400">location_on</span>
                      {selectedEventForAttendees.venue}
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      {eventStats.registeredCount} / {eventStats.capacity} Confirmed Attendees
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedEventForAttendees(null)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${eventStats.isClosed ? 'bg-slate-400' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, (eventStats.registeredCount / eventStats.capacity) * 100)}%` }}
                />
              </div>

              {/* Student list */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-headline text-sm font-bold text-slate-800">
                    Registered Students & Teams ({eventPasses.length})
                  </h4>
                  <div className="text-xs text-slate-500">
                    Active: <span className="font-bold text-emerald-600 font-mono">{eventPasses.filter(p => p.status !== 'CANCELLED').length}</span>
                    {eventPasses.some(p => p.status === 'CANCELLED') && (
                      <> | Cancelled: <span className="font-bold text-rose-600 font-mono">{eventPasses.filter(p => p.status === 'CANCELLED').length}</span></>
                    )}
                  </div>
                </div>

                {eventPasses.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center gap-2 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <span className="material-symbols-outlined text-4xl">group_off</span>
                    <p className="text-xs font-semibold">No students registered for this event yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                    {eventPasses.map((att) => (
                      <div
                        key={att.id}
                        className={`p-3.5 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          att.status === 'CANCELLED' ? 'border-rose-200 bg-rose-50/20 opacity-80' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-headline text-sm font-bold text-slate-900">
                              {att.participantName}
                            </h5>
                            {att.rollNo && (
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                UID: {att.rollNo}
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-slate-400">Pass: {att.id}</span>
                            {att.status === 'CANCELLED' ? (
                              <span className="text-[10px] font-headline font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                Cancelled
                              </span>
                            ) : att.status === 'CHECKED_IN' ? (
                              <span className="text-[10px] font-headline font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Checked In
                              </span>
                            ) : (
                              <span className="text-[10px] font-headline font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                Confirmed
                              </span>
                            )}
                            <span className={`text-[10px] font-headline font-semibold px-2 py-0.5 rounded ${
                              att.participationType === 'team' || att.teamName ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {att.participationType === 'team' || att.teamName ? 'Team Entry' : 'Solo Entry'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                            <span>Email: {att.email || 'N/A'}</span>
                            {att.phone && <span>Phone: {att.phone}</span>}
                            {att.teamName && (
                              <span className="text-primary font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">groups</span>
                                Team: {att.teamName}
                              </span>
                            )}
                            {att.track && <span>Track: {att.track}</span>}
                            {att.tshirtSize && <span>Size: {att.tshirtSize}</span>}
                            {att.dietaryPref && <span>Diet: {att.dietaryPref}</span>}
                            {att.registeredAt && <span>Reg: {new Date(att.registeredAt).toLocaleDateString()}</span>}
                          </div>

                          {att.customAnswer && (
                            <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                              <span className="font-bold text-slate-700">Answer: </span>
                              {typeof att.customAnswer === 'object' ? JSON.stringify(att.customAnswer) : String(att.customAnswer)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                          {att.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleToggleAttendeeCheckIn(att.id)}
                              className={`px-3 py-1.5 rounded-xl font-headline text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                att.status === 'CHECKED_IN'
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  : 'bg-primary hover:bg-primary-dark text-white shadow-xs'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                {att.status === 'CHECKED_IN' ? 'undo' : 'qr_code_scanner'}
                              </span>
                              <span>{att.status === 'CHECKED_IN' ? 'Undo Check-in' : 'Check In'}</span>
                            </button>
                          )}

                          {att.status === 'CANCELLED' ? (
                            <span className="text-xs text-rose-500 font-headline font-semibold italic px-2">
                              Cancelled
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleCancelRegistration(att, false)}
                                className="px-2.5 py-1.5 rounded-xl font-headline text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                                title="Cancel this student's registration"
                              >
                                Cancel Reg
                              </button>
                              {att.teamName && (
                                <button
                                  onClick={() => handleCancelRegistration(att, true)}
                                  className="px-2.5 py-1.5 rounded-xl font-headline text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-2xs"
                                  title={`Cancel entire team "${att.teamName}"`}
                                >
                                  Cancel Team
                                </button>
                              )}
                            </>
                          )}

                          <button
                            onClick={() => handleDeleteAttendee(att.id, att.participantName, att.eventId)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Permanently remove pass from system"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedEventForAttendees(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-headline font-bold shadow-md cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
