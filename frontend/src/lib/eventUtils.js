/**
 * Campus Connect Event Utilities
 * Handles real registration counts, date validation, and registration status.
 */

/**
 * Checks if the event date and time have passed.
 * Supports various formats: '2026-11-20', 'Nov 20, 2026', '20 Nov 2026', etc.
 */
export function isEventDateFinished(dateStr, timeStr) {
  if (!dateStr || typeof dateStr !== 'string') return false
  const cleanDate = dateStr.trim()
  if (!cleanDate) return false

  try {
    let targetDate = new Date(cleanDate)
    
    // If native Date parse fails, attempt month-day fallback with current year
    if (isNaN(targetDate.getTime())) {
      const currentYear = new Date().getFullYear()
      const fallbackWithYear = `${cleanDate}, ${currentYear}`
      targetDate = new Date(fallbackWithYear)
    }

    if (isNaN(targetDate.getTime())) {
      return false
    }

    // Parse time string if provided (e.g. '10:00 AM', '02:30 PM', '18:00')
    if (timeStr && typeof timeStr === 'string' && timeStr.trim()) {
      const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
      if (match) {
        let hours = parseInt(match[1], 10)
        const minutes = parseInt(match[2], 10)
        const modifier = (match[3] || '').toUpperCase()

        if (modifier === 'PM' && hours < 12) hours += 12
        if (modifier === 'AM' && hours === 12) hours = 0

        targetDate.setHours(hours, minutes, 0, 0)
      } else {
        // If time format cannot be parsed, grant until end of the day
        targetDate.setHours(23, 59, 59, 999)
      }
    } else {
      // Default to end of event day
      targetDate.setHours(23, 59, 59, 999)
    }

    return Date.now() > targetDate.getTime()
  } catch {
    return false
  }
}

/**
 * Computes exact registration telemetry for an event given the list of attendee passes.
 * Completely eliminates any fake counts (no defaulting to 50).
 */
export function getEventRegistrationStats(event, passes = []) {
  if (!event) {
    return {
      registeredCount: 0,
      capacity: 100,
      isFull: false,
      isPast: false,
      isClosed: false,
      closeReason: null,
      eventPasses: [],
    }
  }

  const eventIdStr = event.id !== undefined && event.id !== null ? String(event.id) : null
  const eventTitleClean = event.title ? event.title.toLowerCase().trim() : ''

  // Filter active, non-cancelled passes matching this event
  const eventPasses = Array.isArray(passes)
    ? passes.filter((p) => {
        if (!p) return false
        const isCancelled = p.status === 'CANCELLED' || p.status === 'REVOKED'
        if (isCancelled) return false

        const matchesId = eventIdStr && p.eventId !== undefined && p.eventId !== null && String(p.eventId) === eventIdStr
        const matchesTitle = eventTitleClean && p.eventTitle && p.eventTitle.toLowerCase().trim() === eventTitleClean

        return Boolean(matchesId || matchesTitle)
      })
    : []

  // If passes are loaded for this event, use the pass count;
  // otherwise fallback to numeric event.filled (defaulting strictly to 0, NEVER 50)
  const registeredCount = eventPasses.length > 0 ? eventPasses.length : (Number(event.filled) || 0)
  const capacity = Number(event.capacity || event.total) || 100

  const isFull = capacity > 0 && registeredCount >= capacity
  const isPast = isEventDateFinished(event.date, event.time)
  const isClosed = isFull || isPast

  let closeReason = null
  if (isPast) {
    closeReason = 'Date Passed'
  } else if (isFull) {
    closeReason = 'House Full'
  }

  return {
    registeredCount,
    capacity,
    isFull,
    isPast,
    isClosed,
    closeReason,
    eventPasses,
  }
}
