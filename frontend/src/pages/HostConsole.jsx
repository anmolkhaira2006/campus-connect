import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/Toast'
import { apiGetEvents, apiSaveEvent, apiDeleteEvent, subscribeToRealtime } from '../lib/supabase'
import { validateImageFile } from '../lib/imageValidator'

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
  customQuestion: ''
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
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastList, setBroadcastList] = useState([])

  const defaultMockAttendees = [
    {
      id: 'PASS-CU-2026-8812',
      eventTitle: 'HackCU 2026: 24-Hour AI Prototype',
      participantName: 'Rohan Gupta',
      rollNo: '22BCS10419',
      email: 'rohan.gupta@university.edu',
      phone: '9812345678',
      participationType: 'team',
      teamName: 'NeuralSync',
      track: 'Autonomous AI & Agents',
      tshirtSize: 'M',
      dietary: 'Vegetarian',
      status: 'CHECKED_IN',
      registeredAt: '2026-03-20T10:15:00Z',
    },
    {
      id: 'PASS-CU-2026-7241',
      eventTitle: 'HackCU 2026: 24-Hour AI Prototype',
      participantName: 'Priya Verma',
      rollNo: '22BCS10592',
      email: 'priya.v@university.edu',
      phone: '9876501234',
      participationType: 'solo',
      teamName: null,
      track: 'Smart Campus Solutions',
      tshirtSize: 'S',
      dietary: 'Non-Vegetarian',
      status: 'CONFIRMED',
      registeredAt: '2026-03-21T14:30:00Z',
    },
    {
      id: 'PASS-CU-2026-3914',
      eventTitle: 'HackCU 2026: 24-Hour AI Prototype',
      participantName: 'Kabir Mehta',
      rollNo: '22BCS10884',
      email: 'kabir.m@university.edu',
      phone: '9988776655',
      participationType: 'team',
      teamName: 'NeuralSync',
      track: 'Autonomous AI & Agents',
      tshirtSize: 'L',
      dietary: 'Vegetarian',
      status: 'CHECKED_IN',
      registeredAt: '2026-03-22T09:45:00Z',
    },
  ]

  const loadAttendees = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('user_registered_passes') || '[]')
      const combined = [...stored, ...defaultMockAttendees]
      const unique = []
      const seen = new Set()
      for (const item of combined) {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          unique.push(item)
        }
      }
      setAttendees(unique)
    } catch {
      setAttendees(defaultMockAttendees)
    }
  }

  useEffect(() => {
    loadAttendees()
  }, [activeTab])

  const handleToggleCheckIn = (passId) => {
    const updated = attendees.map(att => {
      if (att.id === passId) {
        const nextStatus = att.status === 'CHECKED_IN' ? 'CONFIRMED' : 'CHECKED_IN'
        return { ...att, status: nextStatus }
      }
      return att
    })
    setAttendees(updated)
    try {
      const stored = JSON.parse(localStorage.getItem('user_registered_passes') || '[]')
      const updatedStored = stored.map(p => p.id === passId ? { ...p, status: p.status === 'CHECKED_IN' ? 'CONFIRMED' : 'CHECKED_IN' } : p)
      localStorage.setItem('user_registered_passes', JSON.stringify(updatedStored))
    } catch (e) {
      console.error(e)
    }
    showToast(`Attendee check-in status updated`)
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

  const handleSendBroadcast = (e) => {
    e.preventDefault()
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      showToast('Please provide broadcast subject and announcement message')
      return
    }
    const newBroadcast = {
      id: Date.now(),
      subject: broadcastSubject.trim(),
      message: broadcastMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recipientsCount: attendees.length
    }
    setBroadcastList([newBroadcast, ...broadcastList])
    setBroadcastSubject('')
    setBroadcastMessage('')
    showToast(`Broadcast sent to ${attendees.length} registered attendees!`)
  }

  const userRole = user?.role || localStorage.getItem('userRole') || 'student'
  const isHost = userRole === 'host'

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
        if (isMounted && Array.isArray(events) && events.length > 0) {
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
    const unsub = subscribeToRealtime('events', loadHosted)
    window.addEventListener('event-updated', loadHosted)
    window.addEventListener('storage', loadHosted)

    return () => {
      isMounted = false
      unsub()
      window.removeEventListener('event-updated', loadHosted)
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

  const handleSave = async (e) => {
    e.preventDefault()

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
      id: eventForm.id || Date.now(),
      title: eventForm.title,
      category: eventForm.category || 'Technical & Code',
      venue: eventForm.venue || 'Apex Block Tech Arena',
      date: formattedDate,
      month: monthStr,
      day: dayStr,
      time: '10:00 AM',
      filled: 0,
      total: Number(eventForm.capacity) || 150,
      desc: eventForm.description,
      fullDescription: eventForm.description,
      organizer: eventForm.organization || eventForm.department,
      image: eventForm.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&fit=crop',
      allowTeams: Boolean(eventForm.allowTeams),
      minTeamSize: Number(eventForm.minTeamSize) || 2,
      maxTeamSize: Number(eventForm.maxTeamSize) || 4,
      hasTracks: Boolean(eventForm.hasTracks),
      tracks: eventForm.tracksInput ? eventForm.tracksInput.split(',').map(s => s.trim()).filter(Boolean) : [],
      hasTshirt: Boolean(eventForm.hasTshirt),
      hasDietary: Boolean(eventForm.hasDietary),
      githubRequired: Boolean(eventForm.githubRequired),
      customQuestion: eventForm.customQuestion?.trim() || null,
      origin: 'hosted',
    }

    await apiSaveEvent(newEvent)

    showToast('Event published with configured registration requirements!')
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

        {/* Active Event Banner */}
        {!isEditing && (
          <div className="w-full rounded-2xl bg-on-surface text-white p-5 flex flex-col gap-4 relative overflow-hidden shadow-lg shadow-on-surface/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            
            <div className="flex items-start justify-between z-10">
              <div className="flex flex-col gap-1">
                <span className="px-2 py-0.5 rounded uppercase font-headline text-[10px] font-bold bg-outline/20 backdrop-blur text-white w-fit">ACTIVE NOW</span>
                <h3 className="font-headline text-xl font-bold leading-tight mt-1">HackCU 2026</h3>
              </div>
              <button 
                onClick={() => handleAction('scanner')}
                className="w-10 h-10 rounded-full bg-primary hover:bg-primary-dark transition-colors flex items-center justify-center shadow-md active:scale-95 cursor-pointer"
                title="Open Gate Scanner"
              >
                <span className="material-symbols-outlined text-white">qr_code_scanner</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 z-10 border-t border-white/20">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-white/70 uppercase tracking-wider font-bold font-headline">Checked In</span>
                <span className="text-2xl font-bold font-mono">142<span className="text-sm text-white/50 font-sans">/250</span></span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-white/70 uppercase tracking-wider font-bold font-headline">Check-in Rate</span>
                <span className="text-2xl font-bold font-mono text-tertiary">4.2<span className="text-sm text-white/50 font-sans">/min</span></span>
              </div>
            </div>
            
            <div className="w-full bg-outline/10 rounded-full h-1.5 overflow-hidden z-10">
              <div className="bg-primary h-full rounded-full w-[56%]" />
            </div>
          </div>
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
                      Your Hosted Events ({hostedEvents.length + 1})
                    </h3>
                  </div>
                  
                  {hostedEvents.map((ev) => (
                    <div key={ev.id} className="w-full rounded-2xl bg-white border border-outline-variant shadow-xs p-4 flex flex-col gap-3 group relative">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-headline text-[10px] font-bold uppercase w-fit">
                            Published
                          </span>
                          <h4 className="font-headline text-sm font-bold text-on-surface">{ev.title}</h4>
                        </div>
                        <div className="flex items-center gap-1.5">
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
                      <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">event</span>
                        {ev.date} • {ev.venue}
                      </div>
                    </div>
                  ))}

                  {/* Sample default event */}
                  <div className="w-full rounded-2xl bg-white border border-outline-variant shadow-xs p-4 flex flex-col gap-3 group relative">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-outline-variant text-slate-700 font-headline text-[10px] font-bold w-fit uppercase">
                          Upcoming
                        </span>
                        <h4 className="font-headline text-sm font-bold text-on-surface">Web3 Development Bootcamp</h4>
                      </div>
                      <button 
                        onClick={() => handleEdit({ title: 'Web3 Development Bootcamp', date: 'Nov 15, 2026', capacity: '100', description: 'Learn Web3 fundamentals.', allowTeams: true })}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-primary/10 hover:text-primary flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[17px]">edit</span>
                      </button>
                    </div>
                    <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">event</span>
                      Nov 15, 2026 • Expected 100+ attendees
                    </div>
                  </div>
                </div>

              </div>
            )}
            
            {activeTab === 'attendees' && (
              <div className="flex flex-col gap-4 animate-slide-up">
                {/* Attendee Statistics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-xl font-bold text-slate-900">{attendees.length}</span>
                    <span className="text-[10px] font-headline uppercase font-bold text-slate-500 mt-0.5">Total Registered</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-xl font-bold text-emerald-600">
                      {attendees.filter(a => a.status === 'CHECKED_IN').length}
                    </span>
                    <span className="text-[10px] font-headline uppercase font-bold text-slate-500 mt-0.5">Checked In</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-xl font-bold text-amber-600">
                      {attendees.filter(a => a.status !== 'CHECKED_IN').length}
                    </span>
                    <span className="text-[10px] font-headline uppercase font-bold text-slate-500 mt-0.5">Pending</span>
                  </div>
                </div>

                {/* Search, Filter & CSV Export Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                    <input
                      type="text"
                      placeholder="Search attendee by name, roll, team..."
                      value={attendeeSearch}
                      onChange={e => setAttendeeSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-headline text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Export CSV</span>
                  </button>
                </div>

                {/* Attendee Roster Cards */}
                <div className="flex flex-col gap-2.5">
                  {attendees
                    .filter(a => {
                      const q = attendeeSearch.toLowerCase().trim()
                      if (!q) return true
                      return (
                        a.participantName?.toLowerCase().includes(q) ||
                        a.rollNo?.toLowerCase().includes(q) ||
                        a.email?.toLowerCase().includes(q) ||
                        a.teamName?.toLowerCase().includes(q) ||
                        a.eventTitle?.toLowerCase().includes(q)
                      )
                    })
                    .map(attendee => (
                      <div
                        key={attendee.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-headline text-sm font-bold text-slate-900">
                              {attendee.participantName}
                            </h4>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {attendee.rollNo}
                            </span>
                            <span className={`text-[10px] font-headline font-bold uppercase px-2 py-0.5 rounded ${
                              attendee.status === 'CHECKED_IN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {attendee.status === 'CHECKED_IN' ? 'Checked In' : 'Confirmed'}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-600 line-clamp-1">
                            {attendee.eventTitle}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium pt-0.5">
                            {attendee.teamName && (
                              <span className="flex items-center gap-1 text-primary">
                                <span className="material-symbols-outlined text-[13px]">groups</span>
                                {attendee.teamName}
                              </span>
                            )}
                            {attendee.track && (
                              <span>• Track: {attendee.track}</span>
                            )}
                            {attendee.dietary && (
                              <span>• Diet: {attendee.dietary}</span>
                            )}
                            {attendee.tshirtSize && (
                              <span>• Size: {attendee.tshirtSize}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
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

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-headline font-bold text-slate-700">Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Venue Change / Reporting Time Update"
                      value={broadcastSubject}
                      onChange={e => setBroadcastSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-headline font-bold text-slate-700">Message Content</label>
                    <textarea
                      rows={3}
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
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Send Announcement to {attendees.length} Attendees</span>
                  </button>
                </form>

                {/* Sent Broadcasts */}
                {broadcastList.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Sent Broadcasts</h4>
                    {broadcastList.map(b => (
                      <div key={b.id} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-headline text-xs font-bold text-slate-900">{b.subject}</span>
                          <span className="text-[10px] font-mono text-slate-400">{b.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600">{b.message}</p>
                        <span className="text-[10px] text-primary font-bold mt-1">Sent to {b.recipientsCount} attendees</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
