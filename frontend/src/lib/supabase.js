import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('YOUR_SUPABASE_PROJECT_URL') &&
  !supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null

// ====================================================================
// DATA NORMALIZERS (Maps Postgres column names to frontend camelCase)
// ====================================================================

export function normalizeEventFromDb(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    venue: row.venue,
    date: row.date,
    month: row.month || 'NOV',
    day: row.day || '20',
    time: row.time || '10:00 AM',
    organizer: row.organizer,
    capacity: row.capacity || 200,
    total: row.capacity || 200,
    filled: row.filled || 0,
    desc: row.description || '',
    description: row.description || '',
    fullDescription: row.full_description || row.description || '',
    image: row.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&fit=crop',
    image_url: row.image_url,
    isFlagship: Boolean(row.is_flagship),
    is_flagship: Boolean(row.is_flagship),
    allowTeams: Boolean(row.allow_teams),
    minTeamSize: row.min_team_size || 2,
    maxTeamSize: row.max_team_size || 4,
    hasTracks: Boolean(row.has_tracks),
    tracks: Array.isArray(row.tracks) ? row.tracks : (row.tracks ? JSON.parse(row.tracks) : []),
    hasTshirt: Boolean(row.has_tshirt),
    hasDietary: Boolean(row.has_dietary),
    githubRequired: Boolean(row.github_required),
    customQuestion: row.custom_question || null,
    status: row.status || 'published',
    origin: row.is_flagship ? 'flagship' : 'feed',
    created_at: row.created_at,
  }
}

export function mapEventToDb(ev) {
  return {
    title: ev.title,
    category: ev.category || 'Technical & Code',
    venue: ev.venue || 'Apex Block Tech Arena',
    date: ev.date || 'Nov 20, 2026',
    month: ev.month || 'NOV',
    day: ev.day || '20',
    time: ev.time || '10:00 AM',
    organizer: ev.organizer || 'CU Central Directorate',
    capacity: Number(ev.capacity || ev.total) || 200,
    filled: Number(ev.filled) || 0,
    description: ev.desc || ev.description || '',
    full_description: ev.fullDescription || ev.description || '',
    image_url: ev.image || ev.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&fit=crop',
    is_flagship: Boolean(ev.isFlagship || ev.is_flagship),
    allow_teams: Boolean(ev.allowTeams),
    min_team_size: Number(ev.minTeamSize) || 2,
    max_team_size: Number(ev.maxTeamSize) || 4,
    has_tracks: Boolean(ev.hasTracks),
    tracks: Array.isArray(ev.tracks) ? ev.tracks : [],
    has_tshirt: Boolean(ev.hasTshirt),
    has_dietary: Boolean(ev.hasDietary),
    github_required: Boolean(ev.githubRequired),
    custom_question: ev.customQuestion || null,
    status: ev.status || 'published',
  }
}

export function normalizePassFromDb(row) {
  if (!row) return null
  return {
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.event_title,
    participantName: row.participant_name,
    rollNo: row.roll_no,
    email: row.email,
    phone: row.phone,
    participationType: row.participation_type || 'solo',
    teamName: row.team_name,
    track: row.track,
    tshirtSize: row.tshirt_size,
    dietaryPref: row.dietary_pref,
    githubUrl: row.github_url,
    customAnswer: row.custom_answer,
    qrHash: row.qr_hash,
    status: row.status || 'CONFIRMED',
    registeredAt: row.registered_at,
    checkedInAt: row.checked_in_at,
  }
}

export function mapPassToDb(p) {
  return {
    id: p.id,
    event_id: p.eventId || p.event_id,
    event_title: p.eventTitle || p.event_title || 'Campus Event',
    participant_name: p.participantName || p.name || 'Participant',
    roll_no: p.rollNo || p.roll_no || '22BCS10842',
    email: p.email || 'student@university.edu',
    phone: p.phone || '',
    participation_type: p.participationType || 'solo',
    team_name: p.teamName || null,
    track: p.track || null,
    tshirt_size: p.tshirtSize || p.tshirt_size || null,
    dietary_pref: p.dietaryPref || p.dietary_pref || null,
    github_url: p.githubUrl || p.github_url || null,
    custom_answer: p.customAnswer || p.custom_answer || null,
    qr_hash: p.qrHash || p.qr_hash || `CU-SECURE-HASH-${Date.now()}`,
    status: p.status || 'CONFIRMED',
    registered_at: p.registeredAt || new Date().toISOString(),
  }
}

// ====================================================================
// BACKEND API SERVICES (Events, Passes, Broadcasts, Auth)
// ====================================================================

/** Fetch all events from Supabase with fallback to localStorage */
export async function apiGetEvents() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('id', { ascending: false })

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(normalizeEventFromDb)
      }
    } catch (err) {
      console.warn('Supabase query failed, falling back to local cache:', err)
    }
  }

  // LocalStorage Fallback
  try {
    const hosted = JSON.parse(localStorage.getItem('hosted_events') || '[]')
    return hosted
  } catch {
    return []
  }
}

/** Save or Publish a new event */
export async function apiSaveEvent(eventData) {
  const dbPayload = mapEventToDb(eventData)

  if (isSupabaseConfigured && supabase) {
    try {
      if (eventData.id && typeof eventData.id === 'number' && eventData.id < 1000000) {
        // Update existing
        const { data, error } = await supabase
          .from('events')
          .update(dbPayload)
          .eq('id', eventData.id)
          .select()
          .single()
        if (!error && data) return normalizeEventFromDb(data)
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('events')
          .insert([dbPayload])
          .select()
          .single()
        if (!error && data) return normalizeEventFromDb(data)
      }
    } catch (err) {
      console.error('Supabase save error:', err)
    }
  }

  // LocalStorage fallback
  const existing = JSON.parse(localStorage.getItem('hosted_events') || '[]')
  const newEv = { ...eventData, id: eventData.id || Date.now() }
  const updated = [newEv, ...existing.filter((e) => e.id !== newEv.id)]
  localStorage.setItem('hosted_events', JSON.stringify(updated))
  window.dispatchEvent(new Event('event-updated'))
  window.dispatchEvent(new Event('storage'))
  return newEv
}

/** Delete an event */
export async function apiDeleteEvent(eventId) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('events').delete().eq('id', eventId)
    } catch (err) {
      console.error('Supabase delete error:', err)
    }
  }

  // LocalStorage fallback
  const hosted = JSON.parse(localStorage.getItem('hosted_events') || '[]')
  const updatedHosted = hosted.filter((e) => String(e.id) !== String(eventId))
  localStorage.setItem('hosted_events', JSON.stringify(updatedHosted))

  const deleted = JSON.parse(localStorage.getItem('deleted_event_ids') || '[]')
  const updatedDeleted = [...new Set([...deleted, eventId])]
  localStorage.setItem('deleted_event_ids', JSON.stringify(updatedDeleted))

  const flagships = JSON.parse(localStorage.getItem('flagship_event_ids') || '[]')
  const updatedFlagships = flagships.filter((id) => String(id) !== String(eventId))
  localStorage.setItem('flagship_event_ids', JSON.stringify(updatedFlagships))

  window.dispatchEvent(new Event('event-updated'))
  window.dispatchEvent(new Event('storage'))
}

/** Toggle Flagship Status */
export async function apiToggleFlagship(eventId, isFlagship) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('events')
        .update({ is_flagship: isFlagship })
        .eq('id', eventId)
    } catch (err) {
      console.error('Supabase flagship toggle error:', err)
    }
  }

  // LocalStorage sync
  const flagships = JSON.parse(localStorage.getItem('flagship_event_ids') || '[101, 102, 103]')
  let updated
  if (isFlagship) {
    updated = [...new Set([...flagships, eventId])]
  } else {
    updated = flagships.filter((id) => String(id) !== String(eventId))
  }
  localStorage.setItem('flagship_event_ids', JSON.stringify(updated))
  window.dispatchEvent(new Event('event-updated'))
  window.dispatchEvent(new Event('storage'))
}

/** Fetch all attendee passes */
export async function apiGetPasses(userId = null) {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('passes').select('*').order('registered_at', { ascending: false })
      if (userId) query = query.eq('user_id', userId)
      const { data, error } = await query
      if (!error && Array.isArray(data)) {
        return data.map(normalizePassFromDb)
      }
    } catch (err) {
      console.warn('Supabase fetch passes failed:', err)
    }
  }

  // LocalStorage Fallback
  try {
    return JSON.parse(localStorage.getItem('user_registered_passes') || '[]')
  } catch {
    return []
  }
}

/** Book a new pass */
export async function apiBookPass(passData) {
  const dbPayload = mapPassToDb(passData)

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('passes')
        .insert([dbPayload])
        .select()
        .single()

      if (!error && data) {
        // Increment event filled count in database
        if (passData.eventId) {
          try {
            await supabase.rpc('increment_event_filled', { event_id: passData.eventId })
          } catch {
            // fallback simple update
            const { data: ev } = await supabase.from('events').select('filled').eq('id', passData.eventId).single()
            if (ev) {
              await supabase.from('events').update({ filled: (ev.filled || 0) + 1 }).eq('id', passData.eventId)
            }
          }
        }
        return normalizePassFromDb(data)
      }
    } catch (err) {
      console.error('Supabase book pass error:', err)
    }
  }

  // LocalStorage fallback
  const existing = JSON.parse(localStorage.getItem('user_registered_passes') || '[]')
  const updated = [passData, ...existing]
  localStorage.setItem('user_registered_passes', JSON.stringify(updated))
  window.dispatchEvent(new Event('event-updated'))
  window.dispatchEvent(new Event('storage'))
  return passData
}

/** Update Check-in Status */
export async function apiUpdatePassStatus(passId, nextStatus) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('passes')
        .update({
          status: nextStatus,
          checked_in_at: nextStatus === 'CHECKED_IN' ? new Date().toISOString() : null,
        })
        .eq('id', passId)
    } catch (err) {
      console.error('Supabase update pass status error:', err)
    }
  }

  // LocalStorage fallback
  const existing = JSON.parse(localStorage.getItem('user_registered_passes') || '[]')
  const updated = existing.map((p) =>
    p.id === passId ? { ...p, status: nextStatus, checkedInAt: nextStatus === 'CHECKED_IN' ? new Date().toISOString() : null } : p
  )
  localStorage.setItem('user_registered_passes', JSON.stringify(updated))
  window.dispatchEvent(new Event('event-updated'))
  window.dispatchEvent(new Event('storage'))
}

/** Revoke pass */
export async function apiRevokePass(passId) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('passes').delete().eq('id', passId)
    } catch (err) {
      console.error('Supabase revoke pass error:', err)
    }
  }

  // LocalStorage fallback
  const existing = JSON.parse(localStorage.getItem('user_registered_passes') || '[]')
  const updated = existing.filter((p) => p.id !== passId)
  localStorage.setItem('user_registered_passes', JSON.stringify(updated))
  window.dispatchEvent(new Event('event-updated'))
  window.dispatchEvent(new Event('storage'))
}

/** Get Broadcasts */
export async function apiGetBroadcasts() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && Array.isArray(data)) return data
    } catch (err) {
      console.warn('Supabase broadcasts error:', err)
    }
  }
  return []
}

/** Send Broadcast */
export async function apiSendBroadcast(broadcastData) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .insert([{
          subject: broadcastData.subject,
          message: broadcastData.message,
          priority: broadcastData.priority || 'Normal Info',
          sender: broadcastData.sender || 'Campus Directorate',
        }])
        .select()
        .single()
      if (!error && data) return data
    } catch (err) {
      console.error('Supabase send broadcast error:', err)
    }
  }
  return broadcastData
}

/** Realtime channel subscriber */
export function subscribeToRealtime(tableName, onUpdate) {
  if (!isSupabaseConfigured || !supabase) {
    return () => {}
  }

  const channel = supabase
    .channel(`public:${tableName}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
      onUpdate(payload)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/** Google OAuth Single Sign-On */
export async function apiSignInWithGoogle() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      return { data, error }
    } catch (err) {
      return { error: err }
    }
  }
  return { error: new Error('Supabase client not configured') }
}

/** Email + Password Sign Up */
export async function apiSignUpWithPassword(email, password, metadata = {}) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })
      return { data, error }
    } catch (err) {
      return { error: err }
    }
  }
  return { error: null }
}

/** Email + Password Sign In */
export async function apiSignInWithPassword(email, password) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    } catch (err) {
      return { error: err }
    }
  }
  return { error: null }
}

/** Supabase Sign Out */
export async function apiSignOut() {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Sign out error:', err)
    }
  }
}
