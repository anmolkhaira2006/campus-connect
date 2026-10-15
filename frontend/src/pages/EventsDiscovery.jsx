import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import GlareHover from '../components/GlareHover'
import TiltedCard from '../components/TiltedCard'
import { BadgeTag } from '../components/ui/badge-tag'
import EventRegistrationModal from '../components/EventRegistrationModal'
import EventDetailsModal from '../components/EventDetailsModal'
import { useToast } from '../components/Toast'
import { apiGetEvents, apiGetPasses, subscribeToRealtime } from '../lib/supabase'
import { getEventRegistrationStats } from '../lib/eventUtils'

const categories = [
  'All Streams',
  'Technical & Code',
  'Cultural & Arts',
  'Sports & Athletics',
  'Hackathons & Sprints',
  'Guest Keynotes',
  'Departmental Research',
]

// Real-time weekly campus activity generator calculated strictly from real database events
function getLiveWeekActivity(events = []) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sun, 1 = Mon ... 6 = Sat
  // Start on Monday of current week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

    // Find any matching events from the live feed
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

    const hasEvents = matchingEvents.length > 0
    const footfall = matchingEvents.reduce((acc, ev) => acc + (Number(ev.filled) || 0), 0)
    const capacity = matchingEvents.reduce((acc, ev) => acc + (Number(ev.capacity || ev.total) || 100), 0)
    
    // Intensity derived purely from real scheduled events and tickets booked
    const intensity = hasEvents
      ? Math.min(100, Math.max(15, Math.round((footfall / Math.max(1, capacity)) * 100)))
      : 0

    const label = hasEvents
      ? (matchingEvents.length === 1 ? matchingEvents[0].title : `${matchingEvents.length} Sessions: ${matchingEvents[0].title}`)
      : 'No scheduled sessions'

    return {
      day: name,
      dateNum,
      monthShort,
      monthLong,
      fullDateStr: `${name}, ${monthShort} ${dateNum}`,
      isToday,
      intensity,
      footfall,
      label,
      eventCount: matchingEvents.length,
      events: matchingEvents,
    }
  })

  const startDay = weekDays[0]
  const endDay = weekDays[weekDays.length - 1]
  const rangeStr = `${startDay.monthShort} ${startDay.dateNum} – ${endDay.monthShort} ${endDay.dateNum}`
  const activeDays = weekDays.filter((d) => d.intensity > 0)
  const peakDay = activeDays.length > 0
    ? [...activeDays].sort((a, b) => b.intensity - a.intensity)[0]
    : null

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
      return []
    } catch {
      return []
    }
  })
  const [activePasses, setActivePasses] = useState([])

  const carouselRef = useRef(null)
  const { isLoggedIn, user } = useUser()
  const navigate = useNavigate()
  const showToast = useToast()
  const userRole = user?.role || localStorage.getItem('userRole') || 'student'
  const isHost = userRole === 'host'

  useEffect(() => {
    let isMounted = true

    const syncData = async () => {
      try {
        const [eventsFromApi, passesFromApi] = await Promise.all([
          apiGetEvents(),
          apiGetPasses()
        ])
        if (isMounted && Array.isArray(eventsFromApi)) {
          setCustomEvents(eventsFromApi)
          const activeFlagships = eventsFromApi.filter((ev) => ev.isFlagship).map((ev) => ev.id)
          setFlagshipEventIds(activeFlagships)
        } else if (isMounted) {
          const stored = JSON.parse(localStorage.getItem('hosted_events') || '[]')
          setCustomEvents(Array.isArray(stored) ? stored : [])
        }

        if (isMounted && Array.isArray(passesFromApi)) {
          setActivePasses(passesFromApi)
        } else if (isMounted) {
          const storedPasses = JSON.parse(localStorage.getItem('user_registered_passes') || '[]')
          setActivePasses(Array.isArray(storedPasses) ? storedPasses : [])
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
    const unsubEvents = subscribeToRealtime('events', syncData)
    const unsubPasses = subscribeToRealtime('passes', syncData)

    return () => {
      isMounted = false
      window.removeEventListener('storage', syncData)
      window.removeEventListener('event-updated', syncData)
      unsubEvents()
      unsubPasses()
    }
  }, [])

  // Map of all events for quick lookup
  const allKnownEvents = useMemo(() => {
    const map = new Map()
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

    return list
  }, [flagshipEventIds, allKnownEvents, customEvents, deletedEventIds])

  // Combine feed events from organizer hosted events, minus deleted
  const allFeedEvents = useMemo(() => {
    return customEvents.filter(ev => !deletedEventIds.includes(ev.id))
  }, [customEvents, deletedEventIds])

  // All possible events for saved tab
  const allPossibleEvents = useMemo(() => {
    return customEvents.filter(ev => !deletedEventIds.includes(ev.id))
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

    const stats = getEventRegistrationStats(ev, activePasses)
    if (stats.isClosed) {
      showToast(
        stats.isPast
          ? 'Registration closed: This event date has already passed.'
          : 'Registration closed: This event has reached maximum seating capacity.'
      )
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
            {activeFlagshipEvents.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1.5 mr-2">
                  {activeFlagshipEvents.slice(0, 5).map((_, i) => (
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
            )}
          </div>

          {activeFlagshipEvents.length > 0 ? (
            /* Carousel Track */
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

                        {(() => {
                          const fStats = getEventRegistrationStats(event, activePasses)
                          return (
                            <div className="pt-3 flex flex-col gap-2 mt-auto border-t border-slate-100">
                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                                <span>{fStats.registeredCount} / {fStats.capacity} Registered</span>
                                {fStats.isClosed && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                    Closed ({fStats.closeReason})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleViewDetails(event); }}
                                  className="text-xs font-headline font-bold text-slate-600 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">info</span>
                                  View Details
                                </button>

                                {fStats.isClosed ? (
                                  <button
                                    disabled
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      showToast(`Registration closed: ${fStats.isPast ? 'The event date has passed.' : 'This event has reached full capacity.'}`)
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-headline text-xs font-bold border border-slate-200 cursor-not-allowed"
                                  >
                                    Registrations Closed
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRegisterClick(event); }}
                                    className="px-4 py-2 rounded-xl bg-primary text-white font-headline text-xs font-bold hover:bg-primary-dark active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Register</span>
                                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 sm:p-8 border border-slate-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col gap-1.5 text-center sm:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[11px] font-mono font-bold w-fit mx-auto sm:mx-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Flagship Showcase
              </div>
              <h3 className="font-headline text-lg sm:text-xl font-bold tracking-tight text-white">
                No Flagship Summits Featured Currently
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Premier hackathons, summits, and keynotes are designated as Flagship by the Admin Directorate. Check the directory below for all active campus events.
              </p>
            </div>
            {isHost && (
              <button
                onClick={() => navigate('/host')}
                className="px-4 py-2.5 rounded-xl bg-primary text-white font-headline text-xs font-bold hover:bg-primary-dark transition-all active:scale-95 shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Create Event
              </button>
            )}
          </div>
        )}
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

                      {(() => {
                        const stats = getEventRegistrationStats(event, activePasses)
                        return (
                          <div className="flex items-center gap-3 mt-1 text-on-surface-variant text-xs font-mono">
                            <div className="w-28 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${stats.isClosed ? 'bg-slate-400' : 'bg-primary'}`}
                                style={{ width: `${Math.min(100, (stats.registeredCount / stats.capacity) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {stats.registeredCount} / {stats.capacity} Registered
                            </span>
                            {stats.isClosed && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-headline font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                Closed ({stats.closeReason})
                              </span>
                            )}
                          </div>
                        )
                      })()}
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
                      {(() => {
                        const stats = getEventRegistrationStats(event, activePasses)
                        if (stats.isClosed) {
                          return (
                            <button
                              disabled
                              onClick={(e) => {
                                e.stopPropagation()
                                showToast(`Registration closed: ${stats.isPast ? 'The event date has passed.' : 'This event has reached full seating capacity.'}`)
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-headline text-xs font-bold transition-all cursor-not-allowed border border-slate-200"
                              title={stats.isPast ? 'Event date has passed' : 'Event is full'}
                            >
                              <span>Registrations Closed</span>
                            </button>
                          )
                        }
                        return (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRegisterClick(event); }}
                            className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-headline text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <span>Register</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        )
                      })()}
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
                {liveWeek.peakDay ? (
                  <>
                    Peak participation this week is projected on <span className="font-semibold text-on-surface">{liveWeek.peakDay.fullDateStr}</span> ({liveWeek.peakDay.intensity}% intensity, {liveWeek.peakDay.label}). Hover over any bar to inspect scheduled load and active volume.
                  </>
                ) : (
                  <>
                    No campus sessions currently scheduled for this live week ({liveWeek.rangeStr}). Published events by organizers will automatically plot here in real-time.
                  </>
                )}
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
                          <span className={item.intensity > 0 ? "text-primary-container font-semibold" : "text-slate-400 font-semibold"}>
                            {item.intensity}% Activity
                          </span>
                          <span>•</span>
                          <span>{item.footfall > 0 ? `~${item.footfall.toLocaleString()} students` : '0 students'}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-sans mt-0.5 max-w-[200px] truncate">
                          {item.label}
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-slate-900/95 rotate-45 -mt-1 border-r border-b border-slate-700/60"></div>
                    </div>

                    {/* Bar with Zoom Animation on Hover */}
                    <div className="w-full flex items-end justify-center h-18">
                      <div
                        style={{ height: item.intensity > 0 ? `${Math.max(20, Math.round(item.intensity * 0.70))}px` : '8px' }}
                        className={`w-full rounded-t-lg transition-all duration-300 ease-out origin-bottom transform group-hover:scale-110 group-hover:-translate-y-1 group-hover:shadow-lg ${
                          item.intensity > 0
                            ? item.isToday
                              ? 'bg-primary ring-2 ring-primary/40 shadow-sm shadow-primary/30 group-hover:bg-primary-dark group-hover:shadow-primary/50'
                              : liveWeek.peakDay && item.day === liveWeek.peakDay.day
                              ? 'bg-indigo-400 group-hover:bg-primary group-hover:shadow-indigo-400/40'
                              : 'bg-primary/40 group-hover:bg-primary/70 group-hover:shadow-primary/30'
                            : item.isToday
                            ? 'bg-primary/20 ring-1 ring-primary/30'
                            : 'bg-slate-200 group-hover:bg-slate-300'
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
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'CU'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline text-sm font-bold text-on-surface truncate">
                      {isLoggedIn ? (user?.name || user?.email?.split('@')[0] || 'Student') : 'Guest Explorer'}
                    </span>
                    <span className="text-xs font-mono text-on-surface-variant truncate">
                      {isLoggedIn ? (user?.rollNo ? `UID: ${user.rollNo}` : (user?.email || 'Student')) : 'Sign in to access ID'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-primary-container text-primary font-headline text-xs font-bold">
                  {user?.branch ? (user.branch.length > 10 ? user.branch.slice(0, 10) + '...' : user.branch) : 'Scholar'}
                </span>
              </div>

              {isLoggedIn ? (
                <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-headline text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">military_tech</span>
                      Academic Status
                    </span>
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      {user?.sem || 'Active'} • {user?.year || 'Current'}
                    </span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant truncate">
                    {user?.phone ? `Contact: ${user.phone}` : 'Student identity telemetry synced'}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-headline text-xs font-bold hover:bg-primary-dark transition-all cursor-pointer"
                >
                  Sign In / Sign Up
                </button>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { val: String(activePasses.length), label: 'Passes' },
                  { val: String(savedCount), label: 'Saved' },
                  { val: String(customEvents.length), label: 'Campus' }
                ].map((s) => (
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
                {activePasses.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">Valid</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold">None</span>
                )}
              </div>
              {activePasses.length > 0 ? (
                <div className="p-3.5 rounded-xl bg-slate-50 flex items-center justify-between gap-3 border border-slate-200">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-headline text-xs font-bold text-primary truncate">
                      {activePasses[0].eventTitle || 'Campus Event'}
                    </span>
                    <span className="text-xs font-mono text-on-surface-variant">
                      PASS-ID: {activePasses[0].id}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {activePasses[0].date || 'Gate Entry Permitted'}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-3xl text-slate-400">qr_code_2</span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-xs text-on-surface-variant">No active gate passes found.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Register for an event to claim your QR ticket.</p>
                </div>
              )}
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
