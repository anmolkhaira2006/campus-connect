import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import GlareHover from '../components/GlareHover'
import TiltedCard from '../components/TiltedCard'
import { BadgeTag } from '../components/ui/badge-tag'
import EventRegistrationModal from '../components/EventRegistrationModal'
import EventDetailsModal from '../components/EventDetailsModal'
import { apiGetEvents, subscribeToRealtime } from '../lib/supabase'

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
    description: 'Build real-time generative agents solving regional resource orchestration. High-bandwidth compute clusters and GPU VMs provided.',
    fullDescription: 'HackCU 2026 is North India\'s premier 24-hour collegiate hackathon bringing together over 1,200 student innovators. Compete across AI Agents, Web3, and IoT tracks with industry mentors from Microsoft and Google. Free food, swag kits, and fast-track internship interviews for finalists.',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop',
    allowTeams: true,
    minTeamSize: 2,
    maxTeamSize: 4,
    hasTracks: true,
    tracks: ['Autonomous AI & Agents', 'Fintech & Web3 Systems', 'Healthcare & IoT', 'Smart Campus Solutions'],
    hasTshirt: true,
    hasDietary: true,
    githubRequired: true,
    color: 'bg-primary',
  },
  {
    id: 102,
    title: 'Quantum Computing Primer & Qiskit Lab',
    category: 'Technical & Code',
    date: 'March 28',
    venue: 'Block C Audi 2',
    duration: '3.5 Hours',
    enrolled: '480',
    seats: '48 Remaining',
    organizer: 'Quantum Research Initiative & IBM',
    description: 'Foundations of qubits, superconducting gates, and Qiskit hands-on algorithm implementation led by guest research fellows.',
    fullDescription: 'An intensive masterclass designed for undergraduate students exploring quantum information science. Dive into Bloch spheres, Bell state entanglement, and run simulated algorithms on IBM Quantum simulators. Official IBM certificate included upon completion.',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop',
    allowTeams: false,
    hasTracks: false,
    hasTshirt: false,
    hasDietary: false,
    githubRequired: false,
    color: 'bg-secondary',
  },
  {
    id: 103,
    title: 'Design Systems Summit 2026',
    category: 'Cultural & Arts',
    date: 'April 02',
    venue: 'Design Innovation Center',
    duration: 'Full Day',
    enrolled: '820',
    seats: 'Open to All Branches',
    organizer: 'CU Design Guild & Adobe',
    description: 'Bridging multi-brand tokens, accessibility guarantees, and micro-component architectures for high-concurrency systems.',
    fullDescription: 'Explore the modern intersection of product design, Figma Variables, design tokens, and frontend component engines. Hands-on design critiques and portfolio reviews conducted by senior product designers from leading product firms.',
    image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=400&fit=crop',
    allowTeams: false,
    hasTracks: true,
    tracks: ['Design Tokens & Systems', 'Accessibility & WCAG 2.2', 'Figma to React Pipelines'],
    hasTshirt: true,
    hasDietary: false,
    githubRequired: false,
    color: 'bg-primary',
  },
]

const defaultFeedEvents = [
  {
    id: 1,
    month: 'MAR', day: '26',
    category: 'Technical & Code',
    time: '10:00 AM',
    venue: 'Seminar Hall B3',
    organizer: 'CU Robotics Club',
    title: 'Robotics Club: Autonomous Drone Vision Systems',
    desc: 'Hardware testbed deployment with ROS2 integration and edge TPU inferencing demonstrations on physical quadcopters.',
    fullDescription: 'Learn to deploy YOLOv8 computer vision models onto lightweight Edge TPU coprocessors mounted on quadcopters. Live obstacle avoidance and SLAM navigation demos inside the indoor flight arena.',
    filled: 164, total: 200,
    image: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600&fit=crop',
    allowTeams: true,
    minTeamSize: 2,
    maxTeamSize: 3,
    hasTracks: false,
    hasTshirt: false,
    hasDietary: false,
    githubRequired: false,
  },
  {
    id: 2,
    month: 'MAR', day: '29',
    category: 'Guest Keynotes',
    time: '02:30 PM',
    venue: 'Main University Auditorium',
    organizer: 'Office of International Affairs',
    title: 'Global Fintech Architectures with Ex-Stripe Tech Lead',
    desc: 'Deconstructing fault-tolerant ledger consistency and payment settlements across sovereign boundaries.',
    fullDescription: 'Join ex-Stripe Principal Architect for a deep dive into two-phase commit protocols, idempotent payment settlement pipelines, and managing latency across geo-distributed databases.',
    filled: 450, total: 900,
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&fit=crop',
    allowTeams: false,
    hasTracks: false,
    hasTshirt: false,
    hasDietary: false,
    githubRequired: false,
  },
  {
    id: 3,
    month: 'APR', day: '04',
    category: 'Sports & Athletics',
    time: '08:00 AM',
    venue: 'University Sports Complex',
    organizer: 'Chandigarh University Sports Directorate',
    title: 'Inter-Collegiate Badminton Open Qualifiers',
    desc: 'Singles and doubles league format. Official university referee panel and sports kit verification.',
    fullDescription: 'Official knockout qualifiers for the All-India Inter-University Badminton Championship. Open to men and women singles & doubles. Official Yonex shuttlecocks and certified match referees provided.',
    filled: 92, total: 100,
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&fit=crop',
    allowTeams: true,
    minTeamSize: 1,
    maxTeamSize: 2,
    hasTracks: false,
    hasTshirt: true,
    hasDietary: false,
    githubRequired: false,
  },
  {
    id: 4,
    month: 'APR', day: '08',
    category: 'Cultural & Arts',
    time: '05:30 PM',
    venue: 'Open Air Amphitheatre',
    organizer: 'Symphony Cultural Society',
    title: 'Symphony 2026: Acoustic & Band War Finals',
    desc: 'Battle of the college bands featuring original compositions, classical fusion, and live acoustic rounds.',
    fullDescription: 'The biggest musical showdown of the semester! 12 shortlisted collegiate bands battle across rock, fusion, and indie acoustics in front of celebrated industry jury and an audience of 3,000+ students.',
    filled: 580, total: 600,
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&fit=crop',
    allowTeams: true,
    minTeamSize: 3,
    maxTeamSize: 6,
    hasTracks: false,
    hasTshirt: false,
    hasDietary: false,
    githubRequired: false,
  },
  {
    id: 5,
    month: 'APR', day: '12',
    category: 'Departmental Research',
    time: '11:00 AM',
    venue: 'Center for Advanced Research Labs',
    organizer: 'Department of AI & Data Science',
    title: 'Edge AI Research Colloquium: Small Language Models',
    desc: 'Peer paper presentations on quantized LoRA fine-tuning and running inference on low-power IoT microcontrollers.',
    fullDescription: 'Showcase of 8 approved peer-reviewed research papers authored by university scholars. Topics span 4-bit quantization, state-space models (Mamba), and deploying LLMs on Raspberry Pi 5 clusters.',
    filled: 74, total: 120,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&fit=crop',
    allowTeams: false,
    hasTracks: false,
    hasTshirt: false,
    hasDietary: false,
    githubRequired: true,
  },
  {
    id: 6,
    month: 'APR', day: '18',
    category: 'Hackathons & Sprints',
    time: '09:00 AM',
    venue: 'Innovation Hub Block 6',
    organizer: 'Google Developer Student Club',
    title: 'DevSprint: 12-Hour Cloud Architecture Challenge',
    desc: 'Rapid prototyping marathon leveraging Google Cloud Run, Firestore, and Vertex AI multimodal Gemini models.',
    fullDescription: 'A 12-hour sprint focused on building serverless full-stack web and mobile prototypes. $500 GCP credits granted to each team, with mentorship from Google Developer Experts.',
    filled: 210, total: 250,
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&fit=crop',
    allowTeams: true,
    minTeamSize: 2,
    maxTeamSize: 4,
    hasTracks: true,
    tracks: ['Vertex AI Applications', 'Serverless Microservices', 'Green Cloud Architectures'],
    hasTshirt: true,
    hasDietary: true,
    githubRequired: true,
  }
]

const categories = [
  'All Streams',
  'Technical & Code',
  'Cultural & Arts',
  'Sports & Athletics',
  'Hackathons & Sprints',
  'Guest Keynotes',
  'Departmental Research',
]

// Real-time weekly campus activity generator
function getLiveWeekActivity(events = []) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sun, 1 = Mon ... 6 = Sat
  // Start on Monday of current week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  
  // Real baseline campus flow patterns for each day
  const baseMetrics = [
    { baseIntensity: 62, baseFootfall: 850, label: 'Orientation & Labs' },
    { baseIntensity: 78, baseFootfall: 1120, label: 'Technical Workshops' },
    { baseIntensity: 96, baseFootfall: 1540, label: 'Peak Mid-Week Activity' },
    { baseIntensity: 82, baseFootfall: 1200, label: 'Project Colloquiums' },
    { baseIntensity: 90, baseFootfall: 1450, label: 'Hackathons & Contests' },
    { baseIntensity: 56, baseFootfall: 680, label: 'Sports & Rehearsals' },
    { baseIntensity: 38, baseFootfall: 420, label: 'Vault & Study Circles' },
  ]

  const weekDays = dayNames.map((name, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()

    const dateNum = d.getDate()
    const monthShort = d.toLocaleString('en-US', { month: 'short' })
    const monthLong = d.toLocaleString('en-US', { month: 'long' })

    // Find any matching events from the feed
    const matchingEvents = events.filter((ev) => {
      if (ev.date && typeof ev.date === 'string') {
        const lower = ev.date.toLowerCase()
        if (lower.includes(String(dateNum)) && lower.includes(monthShort.toLowerCase())) return true
      }
      if (ev.day && String(ev.day).padStart(2, '0') === String(dateNum).padStart(2, '0')) {
        if (!ev.month || ev.month.toUpperCase() === monthShort.toUpperCase()) return true
      }
      return false
    })

    const metric = baseMetrics[i]
    const intensity = Math.min(100, metric.baseIntensity + matchingEvents.length * 6)
    const footfall = metric.baseFootfall + matchingEvents.length * 150

    return {
      day: name,
      dateNum,
      monthShort,
      monthLong,
      fullDateStr: `${name}, ${monthShort} ${dateNum}`,
      isToday,
      intensity,
      footfall,
      label: metric.label,
      eventCount: matchingEvents.length,
      events: matchingEvents,
    }
  })

  const startDay = weekDays[0]
  const endDay = weekDays[weekDays.length - 1]
  const rangeStr = `${startDay.monthShort} ${startDay.dateNum} – ${endDay.monthShort} ${endDay.dateNum}`
  const peakDay = [...weekDays].sort((a, b) => b.intensity - a.intensity)[0]

  return { weekDays, rangeStr, peakDay }
}

export default function EventsDiscovery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState(0)
  const [activeSlide, setActiveSlide] = useState(0)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '')
  
  // Sync state if URL query param changes
  useEffect(() => {
    const q = searchParams.get('search')
    if (q !== null) {
      setSearchQuery(q)
    }
  }, [searchParams])

  const handleSearchChange = (val) => {
    setSearchQuery(val)
    if (val.trim()) {
      setSearchParams({ search: val.trim() }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchParams({}, { replace: true })
  }

  const [bookmarked, setBookmarked] = useState(() => {
    try {
      const stored = localStorage.getItem('saved_event_ids')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  // Event Modals
  const [detailsEvent, setDetailsEvent] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Hosted events persisted from Host Console
  const [customEvents, setCustomEvents] = useState([])
  const [deletedEventIds, setDeletedEventIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('deleted_event_ids') || '[]')
    } catch {
      return []
    }
  })
  const [flagshipEventIds, setFlagshipEventIds] = useState(() => {
    try {
      const stored = localStorage.getItem('flagship_event_ids')
      if (stored) return JSON.parse(stored)
      return [101, 102, 103]
    } catch {
      return [101, 102, 103]
    }
  })

  const carouselRef = useRef(null)
  const { isLoggedIn, user } = useUser()
  const navigate = useNavigate()
  const userRole = user?.role || localStorage.getItem('userRole') || 'student'
  const isHost = userRole === 'host'

  useEffect(() => {
    let isMounted = true

    const syncData = async () => {
      try {
        const eventsFromApi = await apiGetEvents()
        if (isMounted && Array.isArray(eventsFromApi) && eventsFromApi.length > 0) {
          setCustomEvents(eventsFromApi)
          const activeFlagships = eventsFromApi.filter((ev) => ev.isFlagship).map((ev) => ev.id)
          if (activeFlagships.length > 0) {
            setFlagshipEventIds(activeFlagships)
          }
        } else if (isMounted) {
          const stored = JSON.parse(localStorage.getItem('hosted_events') || '[]')
          setCustomEvents(Array.isArray(stored) ? stored : [])
        }

        if (isMounted) {
          const deleted = JSON.parse(localStorage.getItem('deleted_event_ids') || '[]')
          setDeletedEventIds(Array.isArray(deleted) ? deleted : [])
          const flagship = JSON.parse(localStorage.getItem('flagship_event_ids') || 'null')
          if (Array.isArray(flagship)) {
            setFlagshipEventIds(flagship)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }

    syncData()
    window.addEventListener('storage', syncData)
    window.addEventListener('event-updated', syncData)
    const unsubscribe = subscribeToRealtime('events', () => {
      syncData()
    })

    return () => {
      isMounted = false
      window.removeEventListener('storage', syncData)
      window.removeEventListener('event-updated', syncData)
      unsubscribe()
    }
  }, [])

  // Map of all events for quick lookup (custom/hosted overrides default)
  const allKnownEvents = useMemo(() => {
    const map = new Map()
    defaultFlagshipEvents.forEach(ev => {
      if (ev && ev.id !== undefined) map.set(String(ev.id), ev)
    })
    defaultFeedEvents.forEach(ev => {
      if (ev && ev.id !== undefined) map.set(String(ev.id), ev)
    })
    customEvents.forEach(ev => {
      if (ev && ev.id !== undefined) map.set(String(ev.id), ev)
    })
    return map
  }, [customEvents])

  // Active flagship events excluding admin deletions, dynamic from CC Admin & Host
  const activeFlagshipEvents = useMemo(() => {
    const list = []
    const seen = new Set()

    // 1. Add events explicitly present in flagshipEventIds
    flagshipEventIds.forEach(id => {
      const ev = allKnownEvents.get(String(id))
      if (ev && !deletedEventIds.includes(ev.id) && !seen.has(String(ev.id))) {
        seen.add(String(ev.id))
        list.push(ev)
      }
    })

    // 2. Add any customEvents flagged as isFlagship
    customEvents.forEach(ev => {
      if (ev.isFlagship && !deletedEventIds.includes(ev.id) && !seen.has(String(ev.id))) {
        seen.add(String(ev.id))
        list.push(ev)
      }
    })

    // 3. Fallback to defaultFlagshipEvents if empty
    if (list.length === 0) {
      return defaultFlagshipEvents.filter(ev => !deletedEventIds.includes(ev.id))
    }
    return list
  }, [flagshipEventIds, allKnownEvents, customEvents, deletedEventIds])

  // Combine feed events with organizer hosted events, minus deleted (custom overrides default)
  const allFeedEvents = useMemo(() => {
    const map = new Map()
    defaultFeedEvents.forEach(ev => {
      if (ev && ev.id !== undefined) map.set(String(ev.id), ev)
    })
    customEvents.forEach(ev => {
      if (ev && ev.id !== undefined) map.set(String(ev.id), ev)
    })
    return Array.from(map.values()).filter(ev => !deletedEventIds.includes(ev.id))
  }, [customEvents, deletedEventIds])

  // Combine all possible events (flagship + custom + feed) for saved tab (custom overrides default)
  const allPossibleEvents = useMemo(() => {
    const map = new Map()
    defaultFlagshipEvents.forEach(ev => {
      if (ev && ev.id !== undefined) map.set(String(ev.id), ev)
    })
    defaultFeedEvents.forEach(ev => {
      if (ev && ev.id !== undefined) map.set(String(ev.id), ev)
    })
    customEvents.forEach(ev => {
      if (ev && ev.id !== undefined) map.set(String(ev.id), ev)
    })
    return Array.from(map.values()).filter(ev => !deletedEventIds.includes(ev.id))
  }, [customEvents, deletedEventIds])

  // Count of bookmarked events
  const savedCount = useMemo(() => {
    return Object.values(bookmarked).filter(Boolean).length
  }, [bookmarked])

  // Live week activity metrics computed from real date
  const liveWeek = useMemo(() => getLiveWeekActivity(allFeedEvents), [allFeedEvents])

  // Filter events based on active category (or 'saved') and search query
  const filteredFeedEvents = useMemo(() => {
    const sourceList = activeCategory === 'saved' ? allPossibleEvents : allFeedEvents

    return sourceList.filter((ev) => {
      // Saved events filter
      if (activeCategory === 'saved') {
        if (!bookmarked[ev.id]) return false
      } else {
        // Category match
        const selectedCat = categories[activeCategory]
        const matchesCategory =
          activeCategory === 0 ||
          ev.category?.toLowerCase() === selectedCat?.toLowerCase() ||
          (selectedCat === 'Hackathons & Sprints' && (ev.category === 'Hackathon' || ev.category === 'Hackathons & Sprints')) ||
          (selectedCat === 'Guest Keynotes' && (ev.category === 'Guest Lecture' || ev.category === 'Guest Keynotes'))

        if (!matchesCategory) return false
      }

      // Search query match
      const q = searchQuery.trim().toLowerCase()
      if (!q) return true

      return (
        ev.title?.toLowerCase().includes(q) ||
        ev.desc?.toLowerCase().includes(q) ||
        ev.description?.toLowerCase().includes(q) ||
        ev.venue?.toLowerCase().includes(q) ||
        ev.organizer?.toLowerCase().includes(q)
      )
    })
  }, [activeCategory, allFeedEvents, allPossibleEvents, bookmarked, searchQuery])

  // Open Event Details First
  const handleViewDetails = (ev) => {
    setDetailsEvent(ev)
    setDetailsOpen(true)
  }

  // Open Registration Modal
  const handleRegisterClick = (ev) => {
    if (!isLoggedIn) {
      showToast('Please log in with your university account to register for events.')
      navigate('/')
      return
    }
    setSelectedEvent(ev)
    setModalOpen(true)
  }

  const scrollCarousel = (direction) => {
    const track = carouselRef.current
    if (!track) return
    const card = track.firstElementChild
    const cardWidth = card ? card.getBoundingClientRect().width + 24 : 380
    track.scrollBy({ left: direction * cardWidth, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const track = carouselRef.current
    if (!track || !track.firstElementChild) return
    const cardWidth = track.firstElementChild.getBoundingClientRect().width + 24
    const idx = Math.round(track.scrollLeft / cardWidth)
    setActiveSlide(Math.min(Math.max(idx, 0), 2))
  }

  const toggleBookmark = (id) => {
    setBookmarked((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem('saved_event_ids', JSON.stringify(next))
      } catch (e) {
        console.error(e)
      }
      showToast(next[id] ? 'Event saved to your bookmarks!' : 'Event removed from bookmarks')
      return next
    })
  }

  return (
    <div className="w-full animate-fade-in pb-20 lg:pb-10">
      {/* Announcement Banner */}
      <section className="w-full bg-white px-4 sm:px-6 lg:px-12 py-3 border-b border-outline-variant/30 flex justify-center">
        <BadgeTag tag="Announcements" text="Official Campus Advisory: Verify your seat registration and gate QR code prior to event start." />
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-12 py-6 flex flex-col gap-10">
        
        {/* Flagship Carousel */}
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-headline text-xs font-bold tracking-wider uppercase text-on-surface-variant">Curated For You</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="font-headline text-xs font-semibold text-on-surface-variant">Engineering • Design • AI</span>
              </div>
              <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">Flagship Campus Summits</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 mr-2">
                {[0, 1, 2].map(i => (
                  <button
                    key={i}
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => {
                      const track = carouselRef.current
                      if (!track || !track.firstElementChild) return
                      const w = track.firstElementChild.getBoundingClientRect().width + 24
                      track.scrollTo({ left: i * w, behavior: 'smooth' })
                      setActiveSlide(i)
                    }}
                    className={`rounded-full transition-all duration-300 ${
                      activeSlide === i ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-outline hover:bg-secondary'
                    }`}
                  />
                ))}
              </div>
              <button onClick={() => scrollCarousel(-1)} aria-label="Previous" className="w-10 h-10 rounded-full bg-white shadow-sm border border-outline-variant flex items-center justify-center text-on-surface hover:bg-slate-50 hover:text-primary transition-all active:scale-95 cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button onClick={() => scrollCarousel(1)} aria-label="Next" className="w-10 h-10 rounded-full bg-white shadow-sm border border-outline-variant flex items-center justify-center text-on-surface hover:bg-slate-50 hover:text-primary transition-all active:scale-95 cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Carousel Track */}
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory no-scrollbar"
          >
            {activeFlagshipEvents.map((event) => (
              <div 
                key={event.id}
                className="snap-start min-w-[300px] sm:min-w-[340px] md:min-w-[380px] lg:min-w-[420px] h-full shrink-0 flex-1 group"
                style={{ height: '390px' }}
              >
                <TiltedCard
                  imageSrc={event.image}
                  altText={event.title}
                  captionText={event.title}
                  containerHeight="100%"
                  containerWidth="100%"
                  imageHeight="100%"
                  imageWidth="100%"
                  rotateAmplitude={8}
                  scaleOnHover={1.02}
                  showMobileWarning={false}
                  showTooltip={false}
                  displayOverlayContent={true}
                  overlayContent={
                    <div 
                      onClick={() => handleViewDetails(event)}
                      className="flex flex-col w-full h-full rounded-2xl overflow-hidden border border-outline-variant/60 shadow-sm h-[390px] cursor-pointer bg-white"
                    >
                      {/* Image Header with Top Badges */}
                      <div className="relative w-full h-48 shrink-0 overflow-hidden bg-slate-900">
                        <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                          <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md font-headline text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                            {event.category}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleBookmark(event.id); }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                              bookmarked[event.id]
                                ? 'bg-blue-600 text-white border border-blue-600 shadow-blue-500/30'
                                : 'bg-white/90 backdrop-blur-md text-slate-700 hover:text-blue-600 hover:bg-white border border-white/60'
                            }`}
                            title={bookmarked[event.id] ? 'Remove from Saved' : 'Save Event'}
                          >
                            <span
                              className="material-symbols-outlined text-[16px]"
                              style={bookmarked[event.id] ? { fontVariationSettings: "'FILL' 1" } : {}}
                            >
                              {bookmarked[event.id] ? 'bookmark' : 'bookmark_border'}
                            </span>
                          </button>
                        </div>

                        <div className="absolute bottom-2.5 left-3.5 right-3.5 text-white">
                          <span className="text-xs font-mono text-white/80">{event.date} • {event.venue}</span>
                        </div>
                      </div>

                      {/* Content Lower Half */}
                      <div className="p-4 flex flex-col justify-between flex-1 bg-white">
                        <div>
                          <h3 className="font-headline text-base font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                            {event.title}
                          </h3>
                          <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                            {event.description}
                          </p>
                        </div>

                        <div className="pt-3 flex items-center justify-between mt-auto border-t border-slate-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewDetails(event); }}
                            className="text-xs font-headline font-bold text-slate-600 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">info</span>
                            View Details
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleRegisterClick(event); }}
                            className="px-4 py-2 rounded-xl bg-primary text-white font-headline text-xs font-bold hover:bg-primary-dark active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                          >
                            <span>Register</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* Browse Events Section Header, Search & Filter Bar */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-headline text-xl font-bold text-on-surface">Browse Events Directory</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Explore, view full event schedules, and register with prefilled university credentials.
              </p>
            </div>

            <span className="font-mono text-xs text-on-surface-variant">
              {filteredFeedEvents.length} Events Available
            </span>
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              placeholder="Search by event title, organizer club, venue, or keyword..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface placeholder:text-on-surface-variant/60 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Category Tabs (Active filtering) & Saved Events Tab */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scroll-smooth no-scrollbar">
            {/* Saved Events Tab */}
            <button
              onClick={() => setActiveCategory('saved')}
              className={`px-4 py-2 rounded-full font-headline text-xs font-bold shrink-0 transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                activeCategory === 'saved'
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30'
                  : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 border border-slate-200'
              }`}
            >
              <span
                className="material-symbols-outlined text-[16px]"
                style={activeCategory === 'saved' || savedCount > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                bookmark
              </span>
              <span>Saved Events</span>
              {savedCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeCategory === 'saved' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {savedCount}
                </span>
              )}
            </button>

            {categories.map((cat, i) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(i)}
                className={`px-4 py-2 rounded-full font-headline text-xs font-bold shrink-0 transition-all duration-200 cursor-pointer ${
                  activeCategory === i
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-on-surface-variant hover:bg-slate-50 hover:text-on-surface border border-outline-variant'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Two-Column Grid: Directory Feed & Right Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Filtered Event Feed */}
          <section className="lg:col-span-8 flex flex-col gap-4">
            {filteredFeedEvents.map((event) => (
              <GlareHover
                key={event.id}
                width="100%"
                height="auto"
                background="white"
                borderRadius="20px"
                borderColor="rgba(226, 232, 240, 0.7)"
                glareOpacity={0.12}
                glareColor="#4338ca"
                className="!block p-4 sm:p-5 rounded-2xl bg-white shadow-xs hover:shadow-md transition-all cursor-pointer border border-outline-variant/60"
              >
                <div 
                  onClick={() => handleViewDetails(event)}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full h-full relative z-10"
                >
                  <div className="flex items-start gap-4">
                    {/* Date Block */}
                    <div className="w-14 h-16 rounded-xl bg-slate-50 flex flex-col items-center justify-center shrink-0 text-center border border-slate-200">
                      <span className="font-headline text-[10px] font-bold uppercase text-slate-500">
                        {event.month || 'APR'}
                      </span>
                      <span className="font-headline text-xl font-bold text-primary leading-none mt-0.5">
                        {event.day || '15'}
                      </span>
                    </div>

                    {/* Details Info */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-headline text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {event.category}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          {event.time || '10:00 AM'} • {event.venue}
                        </span>
                      </div>

                      <h4 className="font-headline text-base font-bold text-on-surface hover:text-primary transition-colors">
                        {event.title}
                      </h4>

                      <p className="text-xs text-on-surface-variant line-clamp-1 leading-relaxed">
                        {event.desc}
                      </p>

                      <div className="flex items-center gap-3 mt-1 text-on-surface-variant text-xs font-mono">
                        <div className="w-28 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, ((event.filled || 50) / (event.total || 100)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {event.filled || 50} / {event.total || 100} Registered
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(event.id); }}
                      className={`p-2 rounded-xl transition-all border cursor-pointer flex items-center justify-center ${
                        bookmarked[event.id]
                          ? 'bg-blue-50 text-blue-600 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 border-slate-200'
                      }`}
                      title={bookmarked[event.id] ? 'Remove from Saved' : 'Save Event'}
                    >
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={bookmarked[event.id] ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        {bookmarked[event.id] ? 'bookmark' : 'bookmark_border'}
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewDetails(event); }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-headline text-xs font-semibold transition-all cursor-pointer"
                      >
                        Details
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRegisterClick(event); }}
                        className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-headline text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>Register</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              </GlareHover>
            ))}

            {filteredFeedEvents.length === 0 && (
              <div className="p-12 rounded-3xl bg-white border border-outline-variant text-center flex flex-col items-center gap-2 text-on-surface-variant shadow-xs">
                <span
                  className={`material-symbols-outlined text-4xl ${activeCategory === 'saved' ? 'text-blue-500' : 'text-slate-300'}`}
                  style={activeCategory === 'saved' ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {activeCategory === 'saved' ? 'bookmark' : 'event_busy'}
                </span>
                <h4 className="font-headline text-base font-bold text-on-surface">
                  {activeCategory === 'saved' ? 'No Saved Events Yet' : 'No Events Matching Criteria'}
                </h4>
                <p className="text-xs text-on-surface-variant max-w-sm leading-relaxed">
                  {activeCategory === 'saved'
                    ? 'You have not saved any events yet. Click the bookmark icon on any summit card or directory event to view it here.'
                    : `We couldn't find any events matching "${searchQuery || categories[activeCategory]}". Try resetting your filter or search keywords.`}
                </p>
                <button
                  onClick={() => { setActiveCategory(0); handleClearSearch(); }}
                  className="mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold font-headline hover:bg-primary-dark transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  {activeCategory === 'saved' ? 'Explore All Events' : 'Reset All Filters'}
                </button>
              </div>
            )}

            {/* Real-time Activity Chart */}
            <div className="p-5 rounded-2xl bg-slate-50 flex flex-col gap-3 mt-2 border border-slate-200 relative overflow-visible">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-headline text-sm font-bold text-on-surface">Campus Activity Intensity</span>
                  <span className="flex h-2 w-2 relative" title="Live data updating in real-time">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-headline text-xs font-bold shadow-2xs">
                  <span className="material-symbols-outlined text-[13px]">date_range</span>
                  <span>Live Week: {liveWeek.rangeStr}</span>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Peak participation this week is projected on <span className="font-semibold text-on-surface">{liveWeek.peakDay.fullDateStr}</span> ({liveWeek.peakDay.intensity}% intensity, {liveWeek.peakDay.label}). Hover over any bar to inspect scheduled load and active volume.
              </p>

              {/* Bars container */}
              <div className="h-28 w-full flex items-end justify-between gap-2.5 pt-7 pb-1">
                {liveWeek.weekDays.map((item) => (
                  <div
                    key={item.day}
                    className="group relative flex-1 flex flex-col items-center h-full justify-end cursor-pointer"
                  >
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-200 pointer-events-none z-30 flex flex-col items-center">
                      <div className="bg-slate-900/95 backdrop-blur-sm text-white py-1.5 px-3 rounded-xl shadow-xl flex flex-col items-center whitespace-nowrap border border-slate-700/60">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold font-headline">
                          <span>{item.fullDateStr}</span>
                          {item.isToday && (
                            <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] rounded-full uppercase tracking-wider font-extrabold leading-none">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono mt-0.5 flex items-center gap-1.5">
                          <span className="text-primary-container font-semibold">{item.intensity}% Activity</span>
                          <span>•</span>
                          <span>~{item.footfall.toLocaleString()} students</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-sans mt-0.5">
                          {item.label}
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-slate-900/95 rotate-45 -mt-1 border-r border-b border-slate-700/60"></div>
                    </div>

                    {/* Bar with Zoom Animation on Hover */}
                    <div className="w-full flex items-end justify-center h-18">
                      <div
                        style={{ height: `${Math.max(20, Math.round(item.intensity * 0.70))}px` }}
                        className={`w-full rounded-t-lg transition-all duration-300 ease-out origin-bottom transform group-hover:scale-110 group-hover:-translate-y-1 group-hover:shadow-lg ${
                          item.isToday
                            ? 'bg-primary ring-2 ring-primary/40 shadow-sm shadow-primary/30 group-hover:bg-primary-dark group-hover:shadow-primary/50'
                            : item.day === liveWeek.peakDay.day
                            ? 'bg-indigo-400 group-hover:bg-primary group-hover:shadow-indigo-400/40'
                            : 'bg-slate-200 group-hover:bg-primary/70 group-hover:shadow-slate-400/30'
                        }`}
                      />
                    </div>

                    {/* Day & Date Labels */}
                    <div className="flex flex-col items-center mt-2 gap-0.5">
                      <span
                        className={`text-[11px] font-mono transition-colors duration-200 group-hover:text-primary group-hover:font-bold ${
                          item.isToday ? 'text-primary font-bold' : 'text-slate-600'
                        }`}
                      >
                        {item.day}
                      </span>
                      <span
                        className={`text-[9px] font-mono leading-none transition-colors duration-200 ${
                          item.isToday ? 'text-primary font-bold' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      >
                        {item.dateNum}
                      </span>
                      {item.isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mt-0.5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right: Dashboard Sidebar */}
          <aside className="lg:col-span-4 flex flex-col gap-5">
            {/* Profile Card */}
            <div className="p-5 rounded-2xl bg-white border border-outline-variant/60 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-headline text-base font-bold shadow-sm">
                    AS
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline text-sm font-bold text-on-surface">Aarav Sharma</span>
                    <span className="text-xs font-mono text-on-surface-variant">UID: 22BCS10842</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-primary-container text-primary font-headline text-xs font-bold">Level 6</span>
              </div>

              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-headline text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">military_tech</span>
                    Campus Trailblazer
                  </span>
                  <span className="text-[11px] font-mono text-on-surface-variant">2,450 / 3,000 XP</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="w-[81%] h-full bg-primary rounded-full transition-all duration-500" />
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  Earn 550 XP more to reach <strong className="text-on-surface font-semibold">Level 7: Campus Vanguard</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[{ val: '14', label: 'Events' }, { val: '3', label: 'Active' }, { val: '9', label: 'Certs' }].map((s) => (
                  <div key={s.label} className="p-2.5 rounded-xl bg-slate-50 flex flex-col border border-slate-200">
                    <span className="font-headline text-base font-bold text-primary">{s.val}</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Gate Pass Quick Link */}
            <div className="p-5 rounded-2xl bg-white border border-outline-variant/60 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-headline text-sm font-bold text-on-surface">Active Gate Pass</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">Valid</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 flex items-center justify-between gap-3 border border-slate-200">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-headline text-xs font-bold text-primary truncate">HackCU 2026 Qualifier</span>
                  <span className="text-xs font-mono text-on-surface-variant">PASS-ID: CU-984-AI</span>
                  <span className="text-[11px] text-slate-500">Gate Entry Open</span>
                </div>
                <span className="material-symbols-outlined text-3xl text-slate-400">qr_code_2</span>
              </div>
              <button
                onClick={() => navigate('/passes')}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-on-surface transition-colors font-headline text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
                Open Passes Wallet
              </button>
            </div>

            {/* Host Console Shortcut - Organizers/Hosts only */}
            {isHost && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">campaign</span>
                  <span className="font-headline text-sm font-bold text-on-surface">Hosting an Event?</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Create events, configure custom registration fields, publish schedules, and track digital check-ins.
                </p>
                <button
                  onClick={() => navigate('/host')}
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-headline text-xs font-bold hover:bg-primary-dark transition-all active:scale-95 shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  Open Host Console
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* 1. Event Details Modal (First View Details) */}
      <EventDetailsModal
        event={detailsEvent}
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        isBookmarked={detailsEvent ? !!bookmarked[detailsEvent.id] : false}
        onToggleBookmark={toggleBookmark}
        onProceedToRegister={(ev) => {
          setDetailsOpen(false)
          handleRegisterClick(ev)
        }}
      />

      {/* 2. Event Registration Modal */}
      <EventRegistrationModal
        event={selectedEvent}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onViewDetails={(ev) => {
          setModalOpen(false)
          handleViewDetails(ev)
        }}
      />
    </div>
  )
}
