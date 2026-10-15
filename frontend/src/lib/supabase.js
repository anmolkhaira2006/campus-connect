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

  let customQuestion = row.custom_question || null
  let certData = {}
  if (customQuestion && typeof customQuestion === 'string' && customQuestion.startsWith('{')) {
    try {
      const parsed = JSON.parse(customQuestion)
      if (parsed.certificate || parsed.question !== undefined) {
        customQuestion = parsed.question || null
        certData = parsed.certificate || {}
      }
    } catch {
      // not JSON
    }
  }

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
    customQuestion: customQuestion,
    hasCertificate: Boolean(certData.hasCertificate || row.has_certificate),
    certificateTitle: certData.certificateTitle || row.certificate_title || '',
    certificateIssuer: certData.certificateIssuer || row.certificate_issuer || '',
    certificateSignatory: certData.certificateSignatory || row.certificate_signatory || '',
    certificateTemplate: certData.certificateTemplate || row.certificate_template || 'gold',
    certificateDescription: certData.certificateDescription || row.certificate_description || '',
    status: row.status || 'published',
    origin: row.is_flagship ? 'flagship' : 'feed',
    created_at: row.created_at,
  }
}

export function mapEventToDb(ev) {
  let encodedCustomQuestion = ev.customQuestion || null
  if (ev.hasCertificate) {
    encodedCustomQuestion = JSON.stringify({
      question: ev.customQuestion || '',
      certificate: {
        hasCertificate: Boolean(ev.hasCertificate),
        certificateTitle: ev.certificateTitle || '',
        certificateIssuer: ev.certificateIssuer || '',
        certificateSignatory: ev.certificateSignatory || '',
        certificateTemplate: ev.certificateTemplate || 'gold',
        certificateDescription: ev.certificateDescription || '',
      },
    })
  }

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
    custom_question: encodedCustomQuestion,
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
    roll_no: p.rollNo || p.roll_no || '',
    email: p.email || '',
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

      if (!error && Array.isArray(data)) {
        const normalized = data.map(normalizeEventFromDb)
        try {
          localStorage.setItem('hosted_events', JSON.stringify(normalized))
        } catch {
          // ignore quota issues
        }
        return normalized
      }
    } catch (err) {
      console.warn('Supabase query failed, falling back to local cache:', err)
    }
  }

  // LocalStorage Fallback (purely user-created events)
  try {
    const hosted = JSON.parse(localStorage.getItem('hosted_events') || '[]')
    return Array.isArray(hosted) ? hosted : []
  } catch {
    return []
  }
}

/** Save or Publish a new event */
export async function apiSaveEvent(eventData) {
  const dbPayload = mapEventToDb(eventData)
  let savedEvent = null

  if (isSupabaseConfigured && supabase) {
    try {
      if (eventData.id && typeof eventData.id === 'number' && eventData.id < 1000000) {
        // Update existing in DB
        const { data, error } = await supabase
          .from('events')
          .update(dbPayload)
          .eq('id', eventData.id)
          .select()
          .single()
        if (!error && data) {
          savedEvent = normalizeEventFromDb(data)
        }
      } else {
        // Insert new into DB
        const { data, error } = await supabase
          .from('events')
          .insert([dbPayload])
          .select()
          .single()
        if (!error && data) {
          savedEvent = normalizeEventFromDb(data)
        }
      }
    } catch (err) {
      console.error('Supabase save error:', err)
    }
  }

  const finalEv = savedEvent || { ...eventData, id: eventData.id || Date.now() }

  // Sync to local cache
  try {
    const existing = JSON.parse(localStorage.getItem('hosted_events') || '[]')
    const updated = [finalEv, ...existing.filter((e) => String(e.id) !== String(finalEv.id))]
    localStorage.setItem('hosted_events', JSON.stringify(updated))
  } catch (e) {
    console.warn('Could not write to local storage cache:', e)
  }

  window.dispatchEvent(new Event('event-updated'))
  window.dispatchEvent(new Event('storage'))
  return finalEv
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

/** Toggle Flagship Status - Restricted to Admin */
export async function apiToggleFlagship(eventId, isFlagship) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('events')
        .update({ is_flagship: Boolean(isFlagship) })
        .eq('id', eventId)
    } catch (err) {
      console.error('Supabase flagship toggle error:', err)
    }
  }

  // LocalStorage sync
  const flagships = JSON.parse(localStorage.getItem('flagship_event_ids') || '[]')
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

/** Save or Update User Profile in Backend & Local Pool */
export async function apiSaveUserProfile(profileData) {
  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Update user metadata in Supabase Auth (persisted permanently in auth.users)
      const { data, error } = await supabase.auth.updateUser({
        data: {
          name: profileData.name,
          full_name: profileData.name,
          rollNo: profileData.rollNo,
          roll_no: profileData.rollNo,
          branch: profileData.branch,
          sem: profileData.sem,
          year: profileData.year,
          phone: profileData.phone,
          role: profileData.role,
          avatar: profileData.avatar,
          interests: profileData.interests,
          isProfileSetup: true,
        },
      })
      if (error) console.warn('Supabase auth metadata update notice:', error.message)

      // 2. Also try upserting to 'profiles' table if accessible
      const currentUser = data?.user || (await supabase.auth.getUser())?.data?.user
      if (currentUser?.id) {
        try {
          await supabase.from('profiles').upsert({
            id: currentUser.id,
            email: currentUser.email,
            name: profileData.name,
            roll_no: profileData.rollNo,
            branch: profileData.branch,
            phone: profileData.phone,
            role: profileData.role,
            avatar_url: profileData.avatar,
          })
        } catch {
          // Table or RLS fallback
        }
      }
    } catch (err) {
      console.warn('apiSaveUserProfile error:', err)
    }
  }

  // Synchronize to registered_users in local cache
  const cleanEmail = profileData.email?.toLowerCase().trim()
  if (cleanEmail) {
    try {
      const localUsers = JSON.parse(localStorage.getItem('registered_users') || '[]')
      const exists = localUsers.some((u) => u.email?.toLowerCase().trim() === cleanEmail)
      const updated = exists
        ? localUsers.map((u) => (u.email?.toLowerCase().trim() === cleanEmail ? { ...u, ...profileData, isProfileSetup: true } : u))
        : [...localUsers, { ...profileData, email: cleanEmail, isProfileSetup: true }]
      localStorage.setItem('registered_users', JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to update registered_users cache:', e)
    }
  }
}

/** Issue Certificate to Attendee for a Completed Event */
export function apiIssueCertificate(attendee, event) {
  const shortPass = String(attendee.id || Date.now()).slice(-4)
  const shortEvt = String(event?.id || attendee.eventId || Date.now()).slice(-4)
  const certId = `CRD-${shortEvt}-${shortPass}`

  const newCert = {
    id: `cert-${attendee.id || Date.now()}`,
    passId: attendee.id,
    eventId: event?.id || attendee.eventId,
    eventTitle: event?.title || attendee.eventTitle || 'Campus Event',
    participantName: attendee.participantName || attendee.name || 'Scholar',
    rollNo: attendee.rollNo || attendee.studentId || '',
    email: attendee.email || '',
    title: event?.certificateTitle || `Certificate of Completion: ${event?.title || attendee.eventTitle}`,
    issuer: event?.certificateIssuer || event?.organizer || 'Chandigarh University Central Directorate',
    signatory: event?.certificateSignatory || 'Dr. Sanjeev Khosla (Dean of Academic Affairs)',
    date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    type: (event?.category || '').toLowerCase().includes('hack') ? 'achievement' : 'participation',
    verified: true,
    credentialId: certId,
    category: event?.category || 'Technical Honor',
    hash: `0x${Array.from(certId).map((c) => c.charCodeAt(0).toString(16)).join('')}`,
    description:
      event?.certificateDescription ||
      `Awarded to ${attendee.participantName || attendee.name} for commendable dedication and successfully completing all requirements in ${event?.title || attendee.eventTitle}.`,
    image:
      event?.image ||
      event?.image_url ||
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&fit=crop',
    template: event?.certificateTemplate || 'gold',
    issuedAt: new Date().toISOString(),
  }

  try {
    const existing = JSON.parse(localStorage.getItem('user_certificates') || '[]')
    const updated = [newCert, ...existing.filter((c) => String(c.passId) !== String(attendee.id))]
    localStorage.setItem('user_certificates', JSON.stringify(updated))
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event('certificate-issued'))
  } catch (err) {
    console.warn('Could not store certificate locally:', err)
  }

  return newCert
}

/** Get all verified certificates for a student */
export async function apiGetCertificates(currentUser = null) {
  const storedCerts = JSON.parse(localStorage.getItem('user_certificates') || '[]')
  const passes = await apiGetPasses()
  const events = await apiGetEvents()

  const userEmail = currentUser?.email?.toLowerCase().trim()
  const userRoll = currentUser?.rollNo?.toLowerCase().trim()
  const userName = currentUser?.name?.toLowerCase().trim()

  // Find all passes for this student that are checked in / completed
  const studentPasses = (Array.isArray(passes) ? passes : []).filter((p) => {
    const pEmail = p.email?.toLowerCase().trim()
    const pRoll = p.rollNo?.toLowerCase().trim()
    const pName = p.participantName?.toLowerCase().trim()
    return (
      (userEmail && pEmail === userEmail) ||
      (userRoll && pRoll === userRoll) ||
      (userName && pName === userName)
    )
  })

  // Dynamic certificates generated from real checked-in passes
  const fromPasses = []
  studentPasses.forEach((pass) => {
    const ev = (Array.isArray(events) ? events : []).find(
      (e) => String(e.id) === String(pass.eventId)
    )
    if (ev && (ev.hasCertificate || ev.certificateTitle) && pass.status === 'CHECKED_IN') {
      const shortPass = String(pass.id).slice(-4)
      const shortEvt = String(ev.id).slice(-4)
      const certId = `CRD-${shortEvt}-${shortPass}`
      fromPasses.push({
        id: `cert-pass-${pass.id}`,
        passId: pass.id,
        eventId: ev.id,
        eventTitle: ev.title,
        participantName: pass.participantName || currentUser?.name || 'Scholar',
        rollNo: pass.rollNo || currentUser?.rollNo || '',
        email: pass.email || currentUser?.email || '',
        title: ev.certificateTitle || `Certificate of Completion: ${ev.title}`,
        issuer: ev.certificateIssuer || ev.organizer || 'Chandigarh University Central Directorate',
        signatory: ev.certificateSignatory || 'Dr. Sanjeev Khosla (Dean of Academic Affairs)',
        date: pass.checkedInAt
          ? new Date(pass.checkedInAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : ev.date || 'Nov 2026',
        type: (ev.category || '').toLowerCase().includes('hack') ? 'achievement' : 'participation',
        verified: true,
        credentialId: certId,
        category: ev.category || 'Technical Honor',
        hash: pass.qrHash || `0x${Array.from(certId).map((c) => c.charCodeAt(0).toString(16)).join('')}`,
        description:
          ev.certificateDescription ||
          `Awarded to ${pass.participantName || currentUser?.name} for successful active participation and completion in ${ev.title}.`,
        image:
          ev.image ||
          ev.image_url ||
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&fit=crop',
        template: ev.certificateTemplate || 'gold',
        issuedAt: pass.checkedInAt || new Date().toISOString(),
      })
    }
  })

  // Filter stored certs by user as well
  const userStored = (Array.isArray(storedCerts) ? storedCerts : []).filter((c) => {
    if (!currentUser) return true
    const cEmail = c.email?.toLowerCase().trim()
    const cRoll = c.rollNo?.toLowerCase().trim()
    const cName = c.participantName?.toLowerCase().trim()
    return (
      (userEmail && cEmail === userEmail) ||
      (userRoll && cRoll === userRoll) ||
      (userName && cName === userName)
    )
  })

  // Merge and deduplicate
  const result = [...userStored]
  fromPasses.forEach((pCert) => {
    if (!result.some((r) => String(r.credentialId) === String(pCert.credentialId))) {
      result.push(pCert)
    }
  })

  return result
}

