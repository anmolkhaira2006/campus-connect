import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/Toast'
import {
  apiGetEvents,
  apiSaveEvent,
  apiDeleteEvent,
  apiGetPasses,
  apiUpdatePassStatus,
  apiCancelRegistration,
  apiIssueCertificate,
  apiGetBroadcasts,
  apiSendBroadcast,
  subscribeToRealtime,
} from '../lib/supabase'
import { validateImageFile, validateCertificateFile } from '../lib/imageValidator'
import { isMasterAdmin } from '../lib/adminAuth'
import { getEventRegistrationStats } from '../lib/eventUtils'

const defaultEventForm = {
  title: '',
  category: 'Technical & Code',
  venue: 'Apex Block Tech Arena',
  date: '2026-11-20',
  capacity: '150',
  description: '',
  department: 'Computer Science',
  organization: 'CU Tech Guild',
  banner: null,
  // Organizer Form Preferences
  allowTeams: false,
  minTeamSize: 2,
  maxTeamSize: 4,
  hasTracks: false,
  tracksInput: 'Autonomous AI & Agents, Distributed Web3, Robotics & IoT',
  hasTshirt: false,
  hasDietary: false,
  githubRequired: false,
  customQuestion: '',
  // Optional Certificate Configuration
  hasCertificate: false,
  certificateTitle: 'Certificate of Completion',
  certificateIssuer: 'CU Apex Technical Directorate & Department of Computer Science',
  certificateSignatory: 'Dr. Sanjeev Khosla (Dean of Academic Affairs)',
  certificateTemplate: 'gold',
  certificateDescription: 'Awarded for active participation and successful completion of all event tracks and demonstrations.',
  certificateImage: null,
}

export default function HostConsole() {
  const showToast = useToast()
  const navigate = useNavigate()
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [eventForm, setEventForm] = useState(defaultEventForm)
  const [hostedEvents, setHostedEvents] = useState([])
  const [attendeeSearch, setAttendeeSearch] = useState('')
  const [attendees, setAttendees] = useState([])
  const [attendeeEventFilter, setAttendeeEventFilter] = useState('all')
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState(null)
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastPriority, setBroadcastPriority] = useState('Normal Info')
  const [broadcastList, setBroadcastList] = useState([])

  const loadBroadcasts = async () => {
    try {
      const bList = await apiGetBroadcasts()
      if (Array.isArray(bList)) {
        setBroadcastList(bList)
      }
    } catch {
      // ignore
    }
  }

  const loadAttendees = async () => {
    try {
      const passes = await apiGetPasses()
      if (Array.isArray(passes)) {
        setAttendees(passes)
      } else {
        const stored = JSON.parse(localStorage.getItem('user_registered_passes') || '[]')
        setAttendees(Array.isArray(stored) ? stored : [])
      }
    } catch {
      setAttendees([])
    }
  }

  useEffect(() => {
    loadAttendees()
    loadBroadcasts()
  }, [activeTab])

  const handleToggleCheckIn = async (passId) => {
    const current = attendees.find(a => a.id === passId)
    const nextStatus = current?.status === 'CHECKED_IN' ? 'CONFIRMED' : 'CHECKED_IN'
    const updated = attendees.map(att => {
      if (att.id === passId) {
        return { ...att, status: nextStatus }
      }
      return att
    })
    setAttendees(updated)

    if (current && nextStatus === 'CHECKED_IN') {
      const matchEvent = hostedEvents.find(e => String(e.id) === String(current.eventId)) || {
        id: current.eventId,
        title: current.eventTitle,
        hasCertificate: true,
      }
      apiIssueCertificate(current, matchEvent)
      showToast(`Checked in! Certificate issued for ${current.participantName}`)
    } else {
      showToast(`Attendee check-in status updated`)
    }

    try {
      await apiUpdatePassStatus(passId, nextStatus)
    } catch (e) {
      console.error(e)
    }
  }

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
      setAttendees(prev =>
        prev.map(a => {
          const isTarget = isTeam && attendee.eventId
            ? String(a.eventId) === String(attendee.eventId) &&
              a.teamName &&
              a.teamName.toLowerCase().trim() === attendee.teamName.toLowerCase().trim()
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

  const handleIssueCertificateManual = (attendee) => {
    const matchEvent = hostedEvents.find(e => String(e.id) === String(attendee.eventId)) || {
      id: attendee.eventId,
      title: attendee.eventTitle,
      hasCertificate: true,
    }
    const cert = apiIssueCertificate(attendee, matchEvent)
    showToast(`Official Certificate issued for ${attendee.participantName} (${cert.credentialId})`)
  }

  const handleIssueAllCertificates = () => {
    const checkedInAttendees = attendees.filter(a => a.status === 'CHECKED_IN')
    if (checkedInAttendees.length === 0) {
      showToast('No checked-in attendees found to issue certificates to.')
      return
    }
    checkedInAttendees.forEach(attendee => {
      const matchEvent = hostedEvents.find(e => String(e.id) === String(attendee.eventId)) || {
        id: attendee.eventId,
        title: attendee.eventTitle,
        hasCertificate: true,
      }
      apiIssueCertificate(attendee, matchEvent)
    })
    showToast(`Successfully issued certificates to ${checkedInAttendees.length} checked-in participants!`)
  }

  const handleExportCSV = () => {
    const headers = ['Pass ID', 'Name', 'Roll No', 'Email', 'Phone', 'Event', 'Type', 'Team', 'Track', 'T-Shirt', 'Dietary', 'Status', 'Registered At']
    const rows = attendees.map(a => [
      `"${a.id || ''}"`,
      `"${a.participantName || ''}"`,
      `"${a.rollNo || ''}"`,
      `"${a.email || ''}"`,
      `"${a.phone || ''}"`,
      `"${a.eventTitle || ''}"`,
      `"${a.participationType || 'solo'}"`,
      `"${a.teamName || 'N/A'}"`,
      `"${a.track || 'General'}"`,
      `"${a.tshirtSize || 'N/A'}"`,
      `"${a.dietary || 'N/A'}"`,
      `"${a.status || 'CONFIRMED'}"`,
      `"${a.registeredAt || ''}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `CU_Event_Registrations_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Attendee roster exported as CSV!')
  }

  const handleSendBroadcast = async (e) => {
    e.preventDefault()
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      showToast('Please provide broadcast subject and announcement message')
      return
    }
    const newBroadcast = {
      id: Date.now(),
      subject: broadcastSubject.trim(),
      message: broadcastMessage.trim(),
      priority: broadcastPriority,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: user?.name ? `${user.name} (Host Organizer)` : 'Host Organizer',
      recipientsCount: attendees.length
    }
    setBroadcastList(prev => [newBroadcast, ...prev])
    setBroadcastSubject('')
    setBroadcastMessage('')
    await apiSendBroadcast(newBroadcast)
    showToast(`Broadcast announcement transmitted across all student portals!`)
  }

  const userRole = user?.role || localStorage.getItem('userRole') || 'student'
  const isHost = userRole === 'host' || userRole === 'admin' || isMasterAdmin(user)

  useEffect(() => {
    if (!isHost) {
      showToast('Access restricted: Host Console is only available to event organizers.')
      navigate('/events', { replace: true })
    }
  }, [isHost, navigate, showToast])

  useEffect(() => {
    let isMounted = true

    const loadHosted = async () => {
      try {
        const events = await apiGetEvents()
        if (isMounted && Array.isArray(events)) {
          setHostedEvents(events)
        } else if (isMounted) {
          const stored = JSON.parse(localStorage.getItem('hosted_events') || '[]')
          setHostedEvents(Array.isArray(stored) ? stored : [])
        }
      } catch (e) {
        console.error(e)
      }
    }

    loadHosted()
    loadBroadcasts()
    const unsubEvents = subscribeToRealtime('events', loadHosted)
    const unsubBroadcasts = subscribeToRealtime('broadcasts', loadBroadcasts)
    window.addEventListener('event-updated', loadHosted)
    window.addEventListener('broadcast-updated', loadBroadcasts)
    window.addEventListener('storage', loadHosted)

    return () => {
      isMounted = false
      unsubEvents()
      unsubBroadcasts()
      window.removeEventListener('event-updated', loadHosted)
      window.removeEventListener('broadcast-updated', loadBroadcasts)
      window.removeEventListener('storage', loadHosted)
    }
  }, [isEditing])

  if (!isHost) return null

  const handleAction = (action) => {
    showToast(`Initializing ${action} module...`)
  }

  const handleEdit = (eventData) => {
    if (eventData) {
      setEventForm({
        ...defaultEventForm,
        ...eventData,
        tracksInput: eventData.tracks ? eventData.tracks.join(', ') : defaultEventForm.tracksInput
      })
    } else {
      setEventForm(defaultEventForm)
    }
    setIsEditing(true)
  }

  const handleEventImageUpload = (e) => {
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
        setEventForm(prev => ({ ...prev, image: uploadEvent.target.result }))
        showToast(`Event poster attached (${check.sizeKb} KB)`)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCertificateImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const check = validateCertificateFile(file)
      if (!check.valid) {
        showToast(check.error || 'Certificate file is too large. Maximum allowed size is 30 KB.')
        e.target.value = ''
        return
      }
      const reader = new FileReader()
      reader.onload = (uploadEvent) => {
        setEventForm(prev => ({ ...prev, certificateImage: uploadEvent.target.result }))
        showToast(`Official Certificate seal attached (${check.sizeKb} KB) - Verified <= 30 KB`)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!eventForm.title.trim()) {
      showToast('Please provide an event title')
      return
    }

    let monthStr = 'NOV'
    let dayStr = '20'
    let formattedDate = eventForm.date || 'Nov 20, 2026'

    if (eventForm.date) {
      const parsed = new Date(eventForm.date)
      if (!isNaN(parsed.getTime())) {
        monthStr = parsed.toLocaleString('en-US', { month: 'short' }).toUpperCase()
        dayStr = String(parsed.getDate()).padStart(2, '0')
        formattedDate = `${parsed.toLocaleString('en-US', { month: 'short' })} ${parsed.getDate()}, ${parsed.getFullYear()}`
      }
    }

    const newEvent = {
      id: eventForm.id || undefined,
      title: eventForm.title.trim(),
      category: eventForm.category || 'Technical & Code',
      venue: eventForm.venue || 'Apex Block Tech Arena',
      date: formattedDate,
      month: monthStr,
      day: dayStr,
      time: eventForm.time || '10:00 AM',
      filled: Number(eventForm.filled) || 0,
      total: Number(eventForm.capacity) || 150,
      capacity: Number(eventForm.capacity) || 150,
      desc: eventForm.description,
      description: eventForm.description,
      fullDescription: eventForm.description,
      organizer: eventForm.organization || eventForm.department || user?.name || 'Club Directorate',
      image: eventForm.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&fit=crop',
      isFlagship: false, // FLAGSHIP OPTION IS ONLY FOR ADMIN!
      is_flagship: false,
      allowTeams: Boolean(eventForm.allowTeams),
      minTeamSize: Number(eventForm.minTeamSize) || 2,
      maxTeamSize: Number(eventForm.maxTeamSize) || 4,
      hasTracks: Boolean(eventForm.hasTracks),
      tracks: eventForm.tracksInput ? eventForm.tracksInput.split(',').map(s => s.trim()).filter(Boolean) : [],
      hasTshirt: Boolean(eventForm.hasTshirt),
      hasDietary: Boolean(eventForm.hasDietary),
      githubRequired: Boolean(eventForm.githubRequired),
      customQuestion: eventForm.customQuestion?.trim() || null,
      hasCertificate: Boolean(eventForm.hasCertificate),
      certificateTitle: eventForm.certificateTitle?.trim() || 'Certificate of Completion',
      certificateIssuer: eventForm.certificateIssuer?.trim() || eventForm.organization || eventForm.department || 'Chandigarh University Central Directorate',
      certificateSignatory: eventForm.certificateSignatory?.trim() || 'Dr. Sanjeev Khosla (Dean of Academic Affairs)',
      certificateTemplate: eventForm.certificateTemplate || 'gold',
      certificateDescription: eventForm.certificateDescription?.trim() || 'Awarded for active participation and successful completion of all event requirements.',
      certificateImage: eventForm.certificateImage || null,
      origin: 'hosted',
      status: 'published',
    }

    const saved = await apiSaveEvent(newEvent)
    if (saved) {
      setHostedEvents(prev => [saved, ...prev.filter(ev => String(ev.id) !== String(saved.id))])
    }

    showToast(`Event "${newEvent.title}" published! Live on Events Discovery.`)
    setIsEditing(false)
  }

  const handleDeleteHostedEvent = async (eventId, eventTitle) => {
    if (!window.confirm(`Delete hosted event "${eventTitle}"?`)) return
    await apiDeleteEvent(eventId)
    setHostedEvents(hostedEvents.filter(ev => String(ev.id) !== String(eventId)))
    showToast(`Event "${eventTitle}" removed from directory`)
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 animate-fade-in pb-24 lg:pb-8">
      <div className="flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-headline text-[11px] text-error uppercase tracking-wider font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                Live Control Room
              </span>
              <h2 className="font-headline text-2xl text-on-surface font-extrabold tracking-tight mt-0.5">Host Console</h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white-container border border-outline-variant flex items-center justify-center text-on-surface shadow-sm relative">
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-error border-2 border-white" />
            </div>
          </div>
          <p className="text-xs text-on-surface-variant">Configure event parameters, registration questions, and attendee telemetry</p>
        </div>

        {/* Dynamic Active Event Banner */}
        {!isEditing && (
          hostedEvents.length > 0 ? (
            <div className="w-full rounded-2xl bg-on-surface text-white p-5 flex flex-col gap-4 relative overflow-hidden shadow-lg shadow-on-surface/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              
              <div className="flex items-start justify-between z-10">
                <div className="flex flex-col gap-1">
                  <span className="px-2 py-0.5 rounded uppercase font-headline text-[10px] font-bold bg-outline/20 backdrop-blur text-white w-fit">ACTIVE EVENT</span>
                  <h3 className="font-headline text-xl font-bold leading-tight mt-1">{hostedEvents[0].title}</h3>
                  <p className="text-xs text-white/70">{hostedEvents[0].date} • {hostedEvents[0].venue}</p>
                </div>
                <button 
                  onClick={() => handleAction('scanner')}
                  className="w-10 h-10 rounded-full bg-primary hover:bg-primary-dark transition-colors flex items-center justify-center shadow-md active:scale-95 cursor-pointer shrink-0"
                  title="Open Gate Scanner"
                >
                  <span className="material-symbols-outlined text-white">qr_code_scanner</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 z-10 border-t border-white/20">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-white/70 uppercase tracking-wider font-bold font-headline">Registrations</span>
                  <span className="text-2xl font-bold font-mono">
                    {attendees.filter(a => String(a.eventId) === String(hostedEvents[0].id) || a.eventTitle === hostedEvents[0].title).length}
                    <span className="text-sm text-white/50 font-sans">/{hostedEvents[0].total || hostedEvents[0].capacity || 100}</span>
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-white/70 uppercase tracking-wider font-bold font-headline">Checked In</span>
                  <span className="text-2xl font-bold font-mono text-tertiary">
                    {attendees.filter(a => (String(a.eventId) === String(hostedEvents[0].id) || a.eventTitle === hostedEvents[0].title) && a.status === 'CHECKED_IN').length}
                  </span>
                </div>
              </div>
              
              <div className="w-full bg-outline/10 rounded-full h-1.5 overflow-hidden z-10">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.round(((hostedEvents[0].filled || 0) / (hostedEvents[0].total || 100)) * 100))}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="w-full rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 flex flex-col gap-3 relative overflow-hidden shadow-lg border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[24px]">campaign</span>
                  </div>
                  <div>
                    <h3 className="font-headline text-lg font-bold">No Active Events Hosted Yet</h3>
                    <p className="text-xs text-slate-300">Publish your club or department event to start accepting campus registrations</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleEdit(null)}
                className="mt-2 w-fit px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-headline text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Publish First Event
              </button>
            </div>
          )
        )}

        {/* Editor Form */}
        {isEditing ? (
          <div className="bg-white rounded-2xl border border-outline-variant shadow-lg p-5 sm:p-6 animate-slide-up flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div>
                <h3 className="font-headline text-lg font-bold text-on-surface">
                  {eventForm.title ? 'Edit Event & Requirements' : 'Create New Event'}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Configure event logistics and choose which fields participants must answer.
                </p>
              </div>
              <button onClick={() => setIsEditing(false)} className="text-on-surface-variant hover:text-error transition-colors cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              
              {/* Event Title */}
              <div className="flex flex-col gap-1.5">
                <label className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider pl-1">Event Title *</label>
                <input 
                  type="text" 
                  value={eventForm.title}
                  onChange={e => setEventForm({...eventForm, title: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  placeholder="e.g. University CodeSprint 2026"
                  required
                />
              </div>

              {/* Category & Venue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider pl-1">Category</label>
                  <select
                    value={eventForm.category}
                    onChange={e => setEventForm({...eventForm, category: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-on-surface focus:outline-none focus:border-primary text-sm"
                  >
                    <option value="Technical & Code">Technical & Code</option>
                    <option value="Hackathons & Sprints">Hackathons & Sprints</option>
                    <option value="Cultural & Arts">Cultural & Arts</option>
                    <option value="Sports & Athletics">Sports & Athletics</option>
                    <option value="Guest Keynotes">Guest Keynotes</option>
                    <option value="Departmental Research">Departmental Research</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider pl-1">Venue / Auditorium</label>
                  <input 
                    type="text" 
                    value={eventForm.venue}
                    onChange={e => setEventForm({...eventForm, venue: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-on-surface focus:outline-none focus:border-primary text-sm"
                    placeholder="e.g. Apex Block Audi"
                  />
                </div>
              </div>

              {/* Date & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider pl-1">Date</label>
                  <input 
                    type="text" 
                    value={eventForm.date}
                    onChange={e => setEventForm({...eventForm, date: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-on-surface focus:outline-none focus:border-primary text-sm"
                    placeholder="e.g. Nov 20, 2026"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider pl-1">Capacity</label>
                  <input 
                    type="number" 
                    value={eventForm.capacity}
                    onChange={e => setEventForm({...eventForm, capacity: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-on-surface focus:outline-none focus:border-primary text-sm"
                    placeholder="e.g. 200"
                    required
                  />
                </div>
              </div>

              {/* Organization & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider pl-1">Host Club / Organization</label>
                  <input 
                    type="text" 
                    value={eventForm.organization}
                    onChange={e => setEventForm({...eventForm, organization: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-on-surface focus:outline-none focus:border-primary text-sm"
                    placeholder="e.g. IEEE Student Branch"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider pl-1">Department</label>
                  <input 
                    type="text" 
                    value={eventForm.department}
                    onChange={e => setEventForm({...eventForm, department: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-on-surface focus:outline-none focus:border-primary text-sm"
                    placeholder="e.g. Computer Science"
                  />
                </div>
              </div>

              {/* Event Poster / Banner (<60KB) */}
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="font-headline text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">add_photo_alternate</span>
                    Event Poster / Cover (Max 60 KB)
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">.jpg, .png, .webp, .svg &le; 60KB</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {eventForm.image && (
                    <img 
                      src={eventForm.image} 
                      alt="Banner Preview" 
                      className="w-16 h-12 rounded-lg object-cover border border-slate-200 shrink-0" 
                    />
                  )}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={handleEventImageUpload}
                    className="text-xs file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider pl-1">Description & Details</label>
                <textarea 
                  value={eventForm.description}
                  onChange={e => setEventForm({...eventForm, description: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-on-surface focus:outline-none focus:border-primary resize-none h-20 text-xs leading-relaxed"
                  placeholder="Tell students what to expect..."
                  required
                />
              </div>

              {/* ORGANIZER REGISTRATION PREFERENCES SECTION */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-3.5 mt-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                  <div>
                    <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-slate-900">
                      Registration Form Fields (Asked to Students)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Only the options checked here will be asked on the student registration form.
                    </p>
                  </div>
                </div>

                {/* Teams Allowed */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={eventForm.allowTeams}
                      onChange={e => setEventForm({...eventForm, allowTeams: e.target.checked})}
                      className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">Allow Team Entries</span>
                      <span className="text-[10px] text-slate-500">Ask for Team Name, Size, and Member UIDs (otherwise individual only)</span>
                    </div>
                  </label>
                </div>

                {/* Tracks Selection */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={eventForm.hasTracks}
                      onChange={e => setEventForm({...eventForm, hasTracks: e.target.checked})}
                      className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">Domain / Competition Tracks</span>
                      <span className="text-[10px] text-slate-500">Ask participant to select a specific challenge track</span>
                    </div>
                  </label>
                  {eventForm.hasTracks && (
                    <input
                      type="text"
                      value={eventForm.tracksInput}
                      onChange={e => setEventForm({...eventForm, tracksInput: e.target.value})}
                      placeholder="Comma separated tracks: AI, Web3, Robotics"
                      className="mt-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50"
                    />
                  )}
                </div>

                {/* Swag / T-Shirt Kit */}
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={eventForm.hasTshirt}
                    onChange={e => setEventForm({...eventForm, hasTshirt: e.target.checked})}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Collect Participant Swag / T-Shirt Size</span>
                    <span className="text-[10px] text-slate-500">Include S, M, L, XL size selection for kit distribution</span>
                  </div>
                </label>

                {/* Food / Dietary */}
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={eventForm.hasDietary}
                    onChange={e => setEventForm({...eventForm, hasDietary: e.target.checked})}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Collect Meal / Dietary Preferences</span>
                    <span className="text-[10px] text-slate-500">Ask for Vegetarian, Non-Veg, or Jain catering choice</span>
                  </div>
                </label>

                {/* GitHub / Portfolio */}
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={eventForm.githubRequired}
                    onChange={e => setEventForm({...eventForm, githubRequired: e.target.checked})}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Require GitHub / Portfolio Link</span>
                    <span className="text-[10px] text-slate-500">Mandatory project portfolio link for screening</span>
                  </div>
                </label>

                {/* Optional Certificate Section */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50/80 to-white border border-amber-200 flex flex-col gap-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={eventForm.hasCertificate}
                      onChange={e => setEventForm({...eventForm, hasCertificate: e.target.checked})}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 mt-0.5"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber-600 text-[18px]">workspace_premium</span>
                        <span className="text-xs font-bold text-slate-900">Issue Verifiable Certificate (Optional)</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Automatically fetch attendees' name & UID to generate cryptographic certificates in their vault upon completion.
                      </span>
                    </div>
                  </label>

                  {eventForm.hasCertificate && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-amber-200/60 animate-fade-in">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-headline font-bold text-slate-700 uppercase">Certificate Title</label>
                        <input
                          type="text"
                          value={eventForm.certificateTitle}
                          onChange={e => setEventForm({...eventForm, certificateTitle: e.target.value})}
                          placeholder="e.g. Certificate of Participation / Merit"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-headline font-bold text-slate-700 uppercase">Issuing Organization</label>
                        <input
                          type="text"
                          value={eventForm.certificateIssuer}
                          onChange={e => setEventForm({...eventForm, certificateIssuer: e.target.value})}
                          placeholder="e.g. Apex Technical Directorate & GDG"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-headline font-bold text-slate-700 uppercase">Authorized Signatory</label>
                        <input
                          type="text"
                          value={eventForm.certificateSignatory}
                          onChange={e => setEventForm({...eventForm, certificateSignatory: e.target.value})}
                          placeholder="e.g. Dr. Sanjeev Khosla (Dean of Academic Affairs)"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-headline font-bold text-slate-700 uppercase">Certificate Template Style</label>
                        <select
                          value={eventForm.certificateTemplate || 'gold'}
                          onChange={e => setEventForm({...eventForm, certificateTemplate: e.target.value})}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                        >
                          <option value="gold">Academic Gold • Classic Honors</option>
                          <option value="indigo">Cyber Indigo • Tech & Hackathons</option>
                          <option value="emerald">Emerald Distinction • Leadership</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[10px] font-headline font-bold text-slate-700 uppercase">Certificate Citation / Description</label>
                        <textarea
                          rows={2}
                          value={eventForm.certificateDescription}
                          onChange={e => setEventForm({...eventForm, certificateDescription: e.target.value})}
                          placeholder="e.g. For exemplary dedication, active participation, and successfully delivering project solutions."
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 resize-none"
                        />
                      </div>

                      {/* Official Certificate Seal / Emblem Upload (Strictly <= 30 KB) */}
                      <div className="sm:col-span-2 flex flex-col gap-1.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-headline font-bold text-amber-900 uppercase flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-amber-600">verified</span>
                            Official Certificate Seal / Emblem (Max 30 KB)
                          </label>
                          <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded">
                            &le; 30 KB Required
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-tight">
                          Upload official club emblem, department logo, or dean stamp (Max 30 KB). Rendered cryptographically on all issued student certificates.
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {eventForm.certificateImage && (
                            <div className="relative group shrink-0">
                              <img 
                                src={eventForm.certificateImage} 
                                alt="Certificate Seal Preview" 
                                className="w-12 h-12 rounded-lg object-contain border border-amber-300 bg-white p-1 shrink-0 shadow-xs" 
                              />
                              <button
                                type="button"
                                onClick={() => setEventForm(prev => ({ ...prev, certificateImage: null }))}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[11px] font-bold hover:bg-rose-600 shadow-sm cursor-pointer"
                                title="Remove Certificate Seal"
                              >
                                &times;
                              </button>
                            </div>
                          )}
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
                            onChange={handleCertificateImageUpload}
                            className="text-xs file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                className="w-full py-3 mt-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-headline text-sm font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Save & Publish Event to Directory</span>
                <span className="material-symbols-outlined text-[18px]">publish</span>
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'attendees', label: 'Attendees' },
                { id: 'broadcast', label: 'Broadcast' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-full font-headline text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-on-surface text-white shadow-md'
                      : 'bg-white text-on-surface-variant border border-outline-variant hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-4 animate-slide-up">
                
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleEdit(null)}
                    className="p-4 rounded-2xl bg-white border border-outline-variant shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors active:scale-95 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-container text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined">add</span>
                    </div>
                    <span className="font-headline text-xs font-bold text-on-surface">New Event</span>
                  </button>
                  <button 
                    onClick={() => handleAction('issue_cert')}
                    className="p-4 rounded-2xl bg-white border border-outline-variant shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors active:scale-95 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-tertiary-container text-tertiary flex items-center justify-center">
                      <span className="material-symbols-outlined">workspace_premium</span>
                    </div>
                    <span className="font-headline text-xs font-bold text-on-surface">Issue Certs</span>
                  </button>
                </div>

                {/* Published & Hosted Events */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline text-sm font-bold text-on-surface uppercase tracking-wide">
                      Your Hosted Events ({hostedEvents.length})
                    </h3>
                  </div>
                  
                  {hostedEvents.map((ev) => {
                    const stats = getEventRegistrationStats(ev, attendees)
                    return (
                      <div key={ev.id} className="w-full rounded-2xl bg-white border border-outline-variant shadow-xs p-4 flex flex-col gap-3 group relative hover:border-slate-300 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-headline text-[10px] font-bold uppercase w-fit">
                                Published
                              </span>
                              {stats.isClosed ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-headline font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                  Registrations Closed ({stats.closeReason})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-headline font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Registrations Open
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-400">ID: {ev.id}</span>
                            </div>
                            <h4 className="font-headline text-base font-bold text-on-surface">{ev.title}</h4>
                            <p className="text-xs text-slate-500 line-clamp-1">{ev.desc || ev.description}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                              onClick={() => handleEdit(ev)}
                              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-primary/10 hover:text-primary flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                              title="Edit Event"
                            >
                              <span className="material-symbols-outlined text-[17px]">edit</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteHostedEvent(ev.id, ev.title)}
                              className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete Event"
                            >
                              <span className="material-symbols-outlined text-[17px]">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Real Registration Telemetry Bar (No Fake Data) */}
                        <div className="flex flex-col gap-1.5 py-2 px-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-slate-700 font-semibold flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-primary">groups</span>
                              <span>{stats.registeredCount} / {stats.capacity} Registered</span>
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {Math.max(0, stats.capacity - stats.registeredCount)} seats remaining
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${stats.isClosed ? 'bg-slate-400' : 'bg-primary'}`}
                              style={{ width: `${Math.min(100, (stats.registeredCount / stats.capacity) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-on-surface-variant">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px]">event</span>
                            <span>{ev.date} • {ev.venue}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedEventForAttendees(ev)}
                              className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-headline text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="View registered students & teams for this event"
                            >
                              <span className="material-symbols-outlined text-[15px]">badge</span>
                              <span>View Registered Students ({stats.registeredCount})</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {hostedEvents.length === 0 && (
                    <div className="w-full rounded-2xl bg-white border border-dashed border-slate-300 p-8 flex flex-col items-center justify-center text-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-slate-300">event_note</span>
                      <h4 className="font-headline text-sm font-bold text-slate-800">No Hosted Events Yet</h4>
                      <p className="text-xs text-slate-500 max-w-sm">
                        You have not published any events yet. Click "Host New Event" to publish your first university summit, workshop, or competition!
                      </p>
                      <button
                        onClick={() => handleEdit(null)}
                        className="mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold font-headline shadow-sm hover:bg-primary-dark transition-all cursor-pointer"
                      >
                        Create First Event
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}
            
            {activeTab === 'attendees' && (
              <div className="flex flex-col gap-4 animate-slide-up">
                {/* Attendee Statistics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-xl font-bold text-slate-900">
                      {attendees.filter(a => a.status !== 'CANCELLED').length}
                    </span>
                    <span className="text-[10px] font-headline uppercase font-bold text-slate-500 mt-0.5">Active Attendees</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-xl font-bold text-emerald-600">
                      {attendees.filter(a => a.status === 'CHECKED_IN').length}
                    </span>
                    <span className="text-[10px] font-headline uppercase font-bold text-slate-500 mt-0.5">Checked In</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-xl font-bold text-rose-600">
                      {attendees.filter(a => a.status === 'CANCELLED').length}
                    </span>
                    <span className="text-[10px] font-headline uppercase font-bold text-slate-500 mt-0.5">Cancelled</span>
                  </div>
                </div>

                {/* Search, Filter & CSV Export Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                    <input
                      type="text"
                      placeholder="Search attendee by name, UID, pass ID, team, email, or phone..."
                      value={attendeeSearch}
                      onChange={e => setAttendeeSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <select
                      value={attendeeEventFilter}
                      onChange={(e) => setAttendeeEventFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-headline font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Events ({attendees.length})</option>
                      {hostedEvents.map((ev) => {
                        const count = attendees.filter(
                          (a) => (String(a.eventId) === String(ev.id) || a.eventTitle === ev.title) && a.status !== 'CANCELLED'
                        ).length
                        return (
                          <option key={ev.id} value={String(ev.id)}>
                            {ev.title} ({count})
                          </option>
                        )
                      })}
                    </select>

                    <button
                      onClick={handleIssueAllCertificates}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-headline text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Generate and issue verified certificates to all checked-in participants"
                    >
                      <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                      <span>Issue All Certs</span>
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-headline text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Attendee Roster Cards */}
                <div className="flex flex-col gap-2.5">
                  {attendees
                    .filter(a => {
                      const q = attendeeSearch.toLowerCase().trim()
                      const matchesSearch =
                        !q ||
                        a.participantName?.toLowerCase().includes(q) ||
                        a.rollNo?.toLowerCase().includes(q) ||
                        a.id?.toLowerCase().includes(q) ||
                        a.email?.toLowerCase().includes(q) ||
                        a.phone?.toLowerCase().includes(q) ||
                        a.teamName?.toLowerCase().includes(q) ||
                        a.eventTitle?.toLowerCase().includes(q)

                      const matchesEvent =
                        attendeeEventFilter === 'all' ||
                        String(a.eventId) === String(attendeeEventFilter) ||
                        hostedEvents.find(e => String(e.id) === String(attendeeEventFilter))?.title === a.eventTitle

                      return matchesSearch && matchesEvent
                    })
                    .map(attendee => (
                      <div
                        key={attendee.id}
                        className={`p-4 rounded-2xl bg-white border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all ${
                          attendee.status === 'CANCELLED' ? 'border-rose-200 bg-rose-50/20 opacity-80' : 'border-slate-200/90'
                        }`}
                      >
                        <div className="flex flex-col gap-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-headline text-sm font-bold text-slate-900">
                              {attendee.participantName}
                            </h4>
                            {attendee.rollNo && (
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                UID: {attendee.rollNo}
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-slate-400">Pass: {attendee.id}</span>
                            <span className={`text-[10px] font-headline font-bold uppercase px-2 py-0.5 rounded ${
                              attendee.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : attendee.status === 'CHECKED_IN'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {attendee.status === 'CANCELLED' ? 'Cancelled' : attendee.status === 'CHECKED_IN' ? 'Checked In' : 'Confirmed'}
                            </span>

                            <span className={`text-[10px] font-headline font-semibold px-2 py-0.5 rounded ${
                              attendee.participationType === 'team' || attendee.teamName ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {attendee.participationType === 'team' || attendee.teamName ? 'Team Entry' : 'Solo Entry'}
                            </span>
                          </div>
                          
                          <p className="text-xs font-semibold text-slate-700">
                            {attendee.eventTitle}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                            <span>Email: {attendee.email || 'N/A'}</span>
                            {attendee.phone && <span>Phone: {attendee.phone}</span>}
                            {attendee.teamName && (
                              <span className="flex items-center gap-1 text-primary font-bold">
                                <span className="material-symbols-outlined text-[13px]">groups</span>
                                Team: {attendee.teamName}
                              </span>
                            )}
                            {attendee.track && (
                              <span>Track: {attendee.track}</span>
                            )}
                            {attendee.dietary && (
                              <span>Diet: {attendee.dietary}</span>
                            )}
                            {attendee.tshirtSize && (
                              <span>Size: {attendee.tshirtSize}</span>
                            )}
                            {attendee.registeredAt && (
                              <span>Reg: {new Date(attendee.registeredAt).toLocaleDateString()}</span>
                            )}
                          </div>

                          {attendee.customAnswer && (
                            <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                              <span className="font-bold text-slate-700">Answer: </span>
                              {typeof attendee.customAnswer === 'object' ? JSON.stringify(attendee.customAnswer) : String(attendee.customAnswer)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                          {attendee.status !== 'CANCELLED' && (
                            <>
                              <button
                                onClick={() => handleIssueCertificateManual(attendee)}
                                className="px-2.5 py-1.5 rounded-xl font-headline text-xs font-semibold border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Generate official completion certificate for this student"
                              >
                                <span className="material-symbols-outlined text-[15px] text-amber-600">workspace_premium</span>
                                <span>Issue Cert</span>
                              </button>

                              <button
                                onClick={() => handleToggleCheckIn(attendee.id)}
                                className={`px-3 py-1.5 rounded-xl font-headline text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  attendee.status === 'CHECKED_IN'
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    : 'bg-primary hover:bg-primary-dark text-white shadow-xs'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  {attendee.status === 'CHECKED_IN' ? 'undo' : 'qr_code_scanner'}
                                </span>
                                <span>{attendee.status === 'CHECKED_IN' ? 'Undo Check-in' : 'Mark Checked In'}</span>
                              </button>

                              <button
                                onClick={() => handleCancelRegistration(attendee, false)}
                                className="px-2.5 py-1.5 rounded-xl font-headline text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                                title="Cancel this student's registration"
                              >
                                Cancel Reg
                              </button>

                              {attendee.teamName && (
                                <button
                                  onClick={() => handleCancelRegistration(attendee, true)}
                                  className="px-2.5 py-1.5 rounded-xl font-headline text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-2xs"
                                  title={`Cancel entire team "${attendee.teamName}"`}
                                >
                                  Cancel Team
                                </button>
                              )}
                            </>
                          )}

                          {attendee.status === 'CANCELLED' && (
                            <span className="text-xs text-rose-500 font-headline font-semibold italic px-2">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                  {attendees.length === 0 && (
                    <div className="py-10 text-center flex flex-col items-center gap-2 text-slate-400">
                      <span className="material-symbols-outlined text-4xl">group_off</span>
                      <p className="text-xs">No registrations found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'broadcast' && (
              <div className="flex flex-col gap-4 animate-slide-up">
                <form onSubmit={handleSendBroadcast} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3.5">
                  <div>
                    <h3 className="font-headline text-sm font-bold text-slate-900">Broadcast Announcement</h3>
                    <p className="text-xs text-slate-500">Send an instant notification and email update to all registered students.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-headline font-bold text-slate-700">Subject</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Venue Change / Reporting Time Update"
                        value={broadcastSubject}
                        onChange={e => setBroadcastSubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-headline font-bold text-slate-700">Priority Level</label>
                      <select
                        value={broadcastPriority}
                        onChange={e => setBroadcastPriority(e.target.value)}
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
                    <label className="text-xs font-headline font-bold text-slate-700">Message Content</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Please report at Block C Room 204 with your laptop and ID card..."
                      value={broadcastMessage}
                      onChange={e => setBroadcastMessage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">campaign</span>
                    <span>Send Announcement to {attendees.length} Attendees</span>
                  </button>
                </form>

                {/* Sent Broadcasts */}
                {broadcastList.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                      Sent Broadcasts ({broadcastList.length})
                    </h4>
                    {broadcastList.map(b => {
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
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                            {b.sender && (
                              <span>From: <strong className="text-slate-600">{b.sender}</strong></span>
                            )}
                            <span className="text-primary font-bold">Transmitted to campus community</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: VIEW REGISTERED STUDENTS & TEAMS FOR HOSTED EVENT      */}
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
                            <span className={`text-[10px] font-headline font-bold uppercase px-2 py-0.5 rounded ${
                              att.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : att.status === 'CHECKED_IN'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {att.status === 'CANCELLED' ? 'Cancelled' : att.status === 'CHECKED_IN' ? 'Checked In' : 'Confirmed'}
                            </span>
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
                            <>
                              <button
                                onClick={() => handleIssueCertificateManual(att)}
                                className="px-2.5 py-1.5 rounded-xl font-headline text-xs font-semibold border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Generate official completion certificate for this student"
                              >
                                <span className="material-symbols-outlined text-[15px] text-amber-600">workspace_premium</span>
                                <span>Issue Cert</span>
                              </button>

                              <button
                                onClick={() => handleToggleCheckIn(att.id)}
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

                          {att.status === 'CANCELLED' && (
                            <span className="text-xs text-rose-500 font-headline font-semibold italic px-2">
                              Cancelled
                            </span>
                          )}
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
