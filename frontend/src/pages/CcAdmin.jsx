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
  apiGetBroadcasts,
  apiSendBroadcast,
  subscribeToRealtime,
} from '../lib/supabase'
import { validateImageFile } from '../lib/imageValidator'

const defaultFlagshipEvents = [
  {
    id: 101,
    title: 'HackCU 2026: 24-Hour AI Prototype',
    category: 'Hackathons & Sprints',
    date: 'March 24-25',
    venue: 'Apex Block Tech Arena',
    duration: '24 Hours',
    enrolled: '1,240',
    organizer: 'Department of Computer Science & Microsoft',
    description: 'Build real-time generative agents solving regional resource orchestration.',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop',
    type: 'Flagship Summit',
  },
  {
    id: 102,
    title: 'Quantum Computing Primer & Qiskit Lab',
    category: 'Technical & Code',
    date: 'March 28',
    venue: 'Block C Audi 2',
    duration: '3.5 Hours',
    enrolled: '480',
    organizer: 'Quantum Research Initiative & IBM',
    description: 'Foundations of qubits, superconducting gates, and Qiskit hands-on algorithm implementation.',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop',
    type: 'Flagship Summit',
  },
  {
    id: 103,
    title: 'Design Systems Summit 2026',
    category: 'Cultural & Arts',
    date: 'April 02',
    venue: 'Design Innovation Center',
    duration: 'Full Day',
    enrolled: '820',
    organizer: 'CU Design Guild & Adobe',
    description: 'Bridging multi-brand tokens, accessibility guarantees, and micro-component architectures.',
    image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=400&fit=crop',
    type: 'Flagship Summit',
  },
]

const defaultFeedEvents = [
  {
    id: 1,
    month: 'MAR', day: '26',
    date: 'Mar 26, 2026',
    category: 'Technical & Code',
    time: '10:00 AM',
    venue: 'Seminar Hall B3',
    organizer: 'CU Robotics Club',
    title: 'Robotics Club: Autonomous Drone Vision Systems',
    desc: 'Hardware testbed deployment with ROS2 integration and edge TPU inferencing demonstrations on physical quadcopters.',
    filled: 164, total: 200,
    image: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600&fit=crop',
    type: 'Directory Feed',
  },
  {
    id: 2,
    month: 'MAR', day: '29',
    date: 'Mar 29, 2026',
    category: 'Guest Keynotes',
    time: '02:30 PM',
    venue: 'Main University Auditorium',
    organizer: 'Office of International Affairs',
    title: 'Global Fintech Architectures with Ex-Stripe Tech Lead',
    desc: 'Deconstructing fault-tolerant ledger consistency and payment settlements across sovereign boundaries.',
    filled: 450, total: 900,
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&fit=crop',
    type: 'Directory Feed',
  },
  {
    id: 3,
    month: 'APR', day: '04',
    date: 'Apr 04, 2026',
    category: 'Sports & Athletics',
    time: '08:00 AM',
    venue: 'University Sports Complex',
    organizer: 'Chandigarh University Sports Directorate',
    title: 'Inter-Collegiate Badminton Open Qualifiers',
    desc: 'Singles and doubles league format. Official university referee panel and sports kit verification.',
    filled: 92, total: 100,
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&fit=crop',
    type: 'Directory Feed',
  },
  {
    id: 4,
    month: 'APR', day: '08',
    date: 'Apr 08, 2026',
    category: 'Cultural & Arts',
    time: '05:30 PM',
    venue: 'Open Air Amphitheatre',
    organizer: 'Symphony Cultural Society',
    title: 'Symphony 2026: Acoustic & Band War Finals',
    desc: 'Battle of the college bands featuring original compositions, classical fusion, and live acoustic rounds.',
    filled: 580, total: 600,
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&fit=crop',
    type: 'Directory Feed',
  },
]

export default function CcAdmin() {
  const showToast = useToast()
  const { user, updateUser } = useUser()

  // Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return (
      sessionStorage.getItem('cc_admin_session') === 'true' ||
      localStorage.getItem('cc_admin_authenticated') === 'true' ||
      user?.role === 'admin'
    )
  })
  const [hasConfiguredKey, setHasConfiguredKey] = useState(() => {
    return Boolean(localStorage.getItem('admin_master_key'))
  })
  const [passkeyInput, setPasskeyInput] = useState('')
  const [initPasskey, setInitPasskey] = useState('')
  const [confirmInitPasskey, setConfirmInitPasskey] = useState('')
  const [showGatePassword, setShowGatePassword] = useState(false)
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'attendees' | 'broadcast' | 'roles'
  const [eventSearch, setEventSearch] = useState('')
  const [eventCategoryFilter, setEventCategoryFilter] = useState('all')

  // Flagship Events State (Admin Only Control)
  const [flagshipIds, setFlagshipIds] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('flagship_event_ids'))
      if (Array.isArray(stored)) return stored
    } catch {
      // fallback
    }
    return [101, 102, 103]
  })

  // Events State
  const [hostedEvents, setHostedEvents] = useState([])
  const [deletedIds, setDeletedIds] = useState([])
  const [editingEvent, setEditingEvent] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
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

  // Security Credentials form state inside Settings
  const [changeKeyForm, setChangeKeyForm] = useState({
    currentKey: '',
    newKey: '',
    confirmNewKey: '',
  })

  // Attendees State
  const [attendees, setAttendees] = useState([])
  const [attendeeQuery, setAttendeeQuery] = useState('')

  // Broadcasts State
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastPriority, setBroadcastPriority] = useState('Normal Info')
  const [broadcasts, setBroadcasts] = useState([])

  // Load state from Supabase with fallback to local storage
  const loadSystemState = async () => {
    try {
      const eventsFromApi = await apiGetEvents()
      if (Array.isArray(eventsFromApi) && eventsFromApi.length > 0) {
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
      const storedFlagship = JSON.parse(localStorage.getItem('flagship_event_ids'))
      if (Array.isArray(storedFlagship)) {
        setFlagshipIds(storedFlagship)
      } else {
        setFlagshipIds([101, 102, 103])
        localStorage.setItem('flagship_event_ids', JSON.stringify([101, 102, 103]))
      }
    } catch {
      setFlagshipIds([101, 102, 103])
    }

    try {
      const passesFromApi = await apiGetPasses()
      const mockPasses = [
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
          status: 'CONFIRMED',
          registeredAt: '2026-03-21T14:30:00Z',
        },
      ]
      const combined = [...(passesFromApi || []), ...mockPasses]
      const seen = new Set()
      const unique = []
      for (const p of combined) {
        if (!seen.has(p.id)) {
          seen.add(p.id)
          unique.push(p)
        }
      }
      setAttendees(unique)
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
    loadSystemState()
    const handleSync = () => {
      loadSystemState()
    }
    window.addEventListener('event-updated', handleSync)
    window.addEventListener('storage', handleSync)

    const unsubEvents = subscribeToRealtime('events', handleSync)
    const unsubPasses = subscribeToRealtime('passes', handleSync)
    const unsubBroadcasts = subscribeToRealtime('broadcasts', handleSync)

    return () => {
      window.removeEventListener('event-updated', handleSync)
      window.removeEventListener('storage', handleSync)
      unsubEvents()
      unsubPasses()
      unsubBroadcasts()
    }
  }, [isAdminAuthenticated])

  // Handle First-time Master Key Initialization (On Admin side only)
  const handleInitializeKey = (e) => {
    e.preventDefault()
    const trimmed = initPasskey.trim()
    if (!trimmed || trimmed.length < 4) {
      showToast('Master passcode must be at least 4 characters long')
      return
    }
    if (trimmed !== confirmInitPasskey.trim()) {
      showToast('Passcodes do not match. Please re-enter.')
      return
    }
    localStorage.setItem('admin_master_key', trimmed)
    setHasConfiguredKey(true)
    setIsAdminAuthenticated(true)
    sessionStorage.setItem('cc_admin_session', 'true')
    localStorage.setItem('cc_admin_authenticated', 'true')
    updateUser({ role: 'admin' })
    showToast('Master Admin Key initialized securely on your browser!')
  }

  // Handle Passkey verification (Validates strictly against admin's saved key)
  const handleVerifyPasskey = (e) => {
    e.preventDefault()
    const storedMaster = localStorage.getItem('admin_master_key')
    if (storedMaster && passkeyInput.trim() === storedMaster) {
      setIsAdminAuthenticated(true)
      sessionStorage.setItem('cc_admin_session', 'true')
      localStorage.setItem('cc_admin_authenticated', 'true')
      updateUser({ role: 'admin' })
      showToast('Super-Admin Root Access Granted!')
    } else {
      showToast('Access Denied: Invalid Master Passcode')
      setPasskeyInput('')
    }
  }

  // Reset Admin Key on this local browser
  const handleResetDeviceKey = () => {
    if (window.confirm('Reset the master passcode on this browser? You will be prompted to create a new key.')) {
      localStorage.removeItem('admin_master_key')
      sessionStorage.removeItem('cc_admin_session')
      localStorage.removeItem('cc_admin_authenticated')
      setHasConfiguredKey(false)
      setIsAdminAuthenticated(false)
      setPasskeyInput('')
      setInitPasskey('')
      setConfirmInitPasskey('')
      showToast('Admin key cleared from this browser. Ready to set your new private key.')
    }
  }

  // Change Key inside Admin Settings
  const handleChangeMasterKey = (e) => {
    e.preventDefault()
    const stored = localStorage.getItem('admin_master_key')
    if (changeKeyForm.currentKey.trim() !== stored) {
      showToast('Current master key is incorrect')
      return
    }
    if (!changeKeyForm.newKey.trim() || changeKeyForm.newKey.trim().length < 4) {
      showToast('New key must be at least 4 characters long')
      return
    }
    if (changeKeyForm.newKey.trim() !== changeKeyForm.confirmNewKey.trim()) {
      showToast('New keys do not match')
      return
    }
    localStorage.setItem('admin_master_key', changeKeyForm.newKey.trim())
    setChangeKeyForm({ currentKey: '', newKey: '', confirmNewKey: '' })
    showToast('Master admin passcode updated successfully!')
  }

  // Toggle Flagship Status (Admin Exclusive)
  const isFlagship = (id) => flagshipIds.includes(id)

  const handleToggleFlagship = async (eventId, eventTitle) => {
    const isCurrentlyFlagship = flagshipIds.includes(eventId)
    const nextState = !isCurrentlyFlagship
    let updated
    if (isCurrentlyFlagship) {
      updated = flagshipIds.filter((id) => id !== eventId)
      showToast(`Removed "${eventTitle}" from Flagship summits`)
    } else {
      updated = [...flagshipIds, eventId]
      showToast(`⭐ Promoted "${eventTitle}" to Flagship! It will now feature in the top 3D carousel.`)
    }
    setFlagshipIds(updated)
    await apiToggleFlagship(eventId, nextState)
  }

  const handleLockSession = () => {
    setIsAdminAuthenticated(false)
    sessionStorage.removeItem('cc_admin_session')
    localStorage.removeItem('cc_admin_authenticated')
    showToast('Admin Console session locked')
  }

  // Combine all active events (Hosted overrides default flagship and feed) excluding deleted ones
  const allSystemEvents = useMemo(() => {
    const map = new Map()
    defaultFlagshipEvents.forEach((ev) => map.set(String(ev.id), { ...ev, origin: 'flagship' }))
    defaultFeedEvents.forEach((ev) => map.set(String(ev.id), { ...ev, origin: 'feed' }))
    hostedEvents.forEach((ev) => map.set(String(ev.id), { ...ev, origin: 'hosted' }))
    return Array.from(map.values()).filter((ev) => !deletedIds.includes(ev.id))
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

  // Restore Default Events
  const handleRestoreDefaults = async () => {
    if (!window.confirm('Restore all default flagship and feed events?')) return
    setDeletedIds([])
    localStorage.removeItem('deleted_event_ids')
    const defaultFlagships = [101, 102, 103]
    setFlagshipIds(defaultFlagships)
    localStorage.setItem('flagship_event_ids', JSON.stringify(defaultFlagships))

    window.dispatchEvent(new Event('event-updated'))
    window.dispatchEvent(new Event('storage'))

    showToast('Default campus events restored!')
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

  // Revoke / Delete Attendee Pass
  const handleDeleteAttendee = async (passId, participantName) => {
    if (!window.confirm(`Revoke pass ${passId} for ${participantName}?`)) return
    const updated = attendees.filter((a) => a.id !== passId)
    setAttendees(updated)
    await apiRevokePass(passId)
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

  // Switch Role
  const handleSetUserRole = (targetRole) => {
    updateUser({ role: targetRole })
    localStorage.setItem('userRole', targetRole)
    showToast(`Active account role set to: ${targetRole.toUpperCase()}`)
  }

  // -------------------------------------------------------------
  // RENDER: RESTRICTED ACCESS GATE (If Not Authenticated)
  // -------------------------------------------------------------
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 flex flex-col items-center text-center gap-6 animate-scale-in relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-600" />
          
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-[32px]">shield_person</span>
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              {hasConfiguredKey ? 'Restricted Area // cc-a-d-m-i-n' : 'Terminal Security Setup'}
            </span>
            <h2 className="font-headline text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
              {hasConfiguredKey ? 'Super-Admin Gate' : 'Set Master Admin Key'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {hasConfiguredKey
                ? 'Enter your private master passcode to unlock root administrative control.'
                : 'No master key is configured on this terminal. Set your private administrator key below. It will remain strictly on your side.'}
            </p>
          </div>

          {!hasConfiguredKey ? (
            /* First-Time Setup on this Terminal */
            <form onSubmit={handleInitializeKey} className="w-full flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-headline font-bold text-slate-700">Create Master Passcode</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    lock
                  </span>
                  <input
                    type={showGatePassword ? 'text' : 'password'}
                    required
                    placeholder="Create a private master key..."
                    value={initPasskey}
                    onChange={(e) => setInitPasskey(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGatePassword(!showGatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showGatePassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-headline font-bold text-slate-700">Confirm Master Passcode</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    verified_user
                  </span>
                  <input
                    type={showGatePassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter your private key..."
                    value={confirmInitPasskey}
                    onChange={(e) => setConfirmInitPasskey(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer mt-1"
              >
                <span className="material-symbols-outlined text-[16px]">key</span>
                <span>Save Key & Unlock Admin Console</span>
              </button>
            </form>
          ) : (
            /* Standard Secure Login */
            <form onSubmit={handleVerifyPasskey} className="w-full flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-headline font-bold text-slate-700">Master Passcode</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    key
                  </span>
                  <input
                    type={showGatePassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your master key..."
                    value={passkeyInput}
                    onChange={(e) => setPasskeyInput(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGatePassword(!showGatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showGatePassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">lock_open</span>
                <span>Unlock Admin Console</span>
              </button>
            </form>
          )}

          <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100 text-xs">
            <Link
              to="/events"
              className="font-headline font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← Return to Events
            </Link>

            {hasConfiguredKey && (
              <button
                type="button"
                onClick={handleResetDeviceKey}
                className="font-headline text-[11px] text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
              >
                Reset Key on this Device
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // RENDER: SUPER-ADMIN COMMAND CENTER (When Authenticated)
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

        <div className="flex items-center gap-2.5 self-end md:self-center z-10">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-headline font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Host New Event</span>
          </button>
          <button
            onClick={handleLockSession}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-headline font-semibold flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Lock</span>
          </button>
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
                  ev.title?.toLowerCase().includes(q) ||
                  ev.venue?.toLowerCase().includes(q) ||
                  ev.organizer?.toLowerCase().includes(q)
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
                placeholder="Search by student name, roll number, pass ID, or event..."
                value={attendeeQuery}
                onChange={(e) => setAttendeeQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              onClick={handleExportMasterCSV}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-headline font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export Master CSV</span>
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {attendees
              .filter((a) => {
                const q = attendeeQuery.toLowerCase().trim()
                if (!q) return true
                return (
                  a.participantName?.toLowerCase().includes(q) ||
                  a.rollNo?.toLowerCase().includes(q) ||
                  a.id?.toLowerCase().includes(q) ||
                  a.eventTitle?.toLowerCase().includes(q) ||
                  a.email?.toLowerCase().includes(q)
                )
              })
              .map((att) => (
                <div
                  key={att.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-headline text-sm font-bold text-slate-900">
                        {att.participantName}
                      </h4>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {att.rollNo}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">Pass: {att.id}</span>
                      <span
                        className={`text-[10px] font-headline font-bold uppercase px-2 py-0.5 rounded ${
                          att.status === 'CHECKED_IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {att.status === 'CHECKED_IN' ? 'Checked In' : 'Confirmed'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1">{att.eventTitle}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>Email: {att.email}</span>
                      {att.teamName && <span className="text-primary font-bold">Team: {att.teamName}</span>}
                      {att.track && <span>Track: {att.track}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleAttendeeCheckIn(att.id)}
                      className={`px-3 py-1.5 rounded-xl font-headline text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        att.status === 'CHECKED_IN'
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-primary hover:bg-primary-dark text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {att.status === 'CHECKED_IN' ? 'undo' : 'qr_code_scanner'}
                      </span>
                      <span>{att.status === 'CHECKED_IN' ? 'Undo Check-in' : 'Mark Checked In'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteAttendee(att.id, att.participantName)}
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Revoke and delete registration"
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
                  <option value="Normal Info">Normal Info</option>
                  <option value="Priority Alert">Priority Alert</option>
                  <option value="Urgent Directive">Urgent Directive</option>
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
                Broadcast Dispatch Log
              </h4>
              {broadcasts.map((b) => (
                <div key={b.id} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-headline text-xs font-bold text-slate-900">{b.subject}</span>
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-primary/10 text-primary">
                        {b.priority}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{b.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600">{b.message}</p>
                </div>
              ))}
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

          {/* Admin Security & Master Key (On User side only) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-headline text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-rose-600 text-[18px]">lock_reset</span>
                  <span>Master Admin Security Key</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Manage your private master passcode. This key is stored securely on your browser terminal only.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetDeviceKey}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-headline font-bold transition-all cursor-pointer self-start sm:self-auto"
              >
                Reset Key on this Device
              </button>
            </div>

            <form onSubmit={handleChangeMasterKey} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-headline font-bold text-slate-700">Current Key</label>
                <input
                  type="password"
                  required
                  placeholder="Current master key"
                  value={changeKeyForm.currentKey}
                  onChange={(e) => setChangeKeyForm({ ...changeKeyForm, currentKey: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-headline font-bold text-slate-700">New Key</label>
                <input
                  type="password"
                  required
                  placeholder="New master key (min 4 chars)"
                  value={changeKeyForm.newKey}
                  onChange={(e) => setChangeKeyForm({ ...changeKeyForm, newKey: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-headline font-bold text-slate-700">Confirm New Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    required
                    placeholder="Confirm new key"
                    value={changeKeyForm.confirmNewKey}
                    onChange={(e) => setChangeKeyForm({ ...changeKeyForm, confirmNewKey: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-headline font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
                  >
                    Update Key
                  </button>
                </div>
              </div>
            </form>
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

    </div>
  )
}
