import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { useUser } from '../context/UserContext'
import LightTunnel from '../components/LightTunnel'
import ParticleText from '../components/ParticleText'
import SplitText from '../components/SplitText'
import GradientWaves from '../components/GradientWaves'
import ProfileSetupModal from '../components/ProfileSetupModal'
import {
  apiSignInWithGoogle,
  apiSignUpWithPassword,
  apiSignInWithPassword,
  apiSaveUserProfile,
  apiFindDatabaseUser,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase'
import { hashPassword, verifyPasswordHash } from '../lib/cryptoUtils'

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [setupPortalOpen, setSetupPortalOpen] = useState(false)
  const [pendingSignupData, setPendingSignupData] = useState(null)
  const navigate = useNavigate()
  const showToast = useToast()
  const { isLoggedIn, login, logout } = useUser()
  const [scrollProgress, setScrollProgress] = useState(0)

  const [role, setRole] = useState('student')
  const [showTagline, setShowTagline] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTagline(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const progress = Math.min(1, Math.max(0, scrollY / (windowHeight * 0.75)))
      setScrollProgress(progress)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToAuth = (msg) => {
    if (msg) showToast(msg)
    const authEl = document.getElementById('auth-section')
    if (authEl) {
      authEl.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const cleanInput = email.toLowerCase().trim()
    if (!cleanInput) {
      showToast(isLogin ? 'Please enter your email or Student ID / Roll No' : 'Please enter your university email address')
      return
    }

    if (!isLogin) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(cleanInput)) {
        showToast('Please enter a valid university email address')
        return
      }
      if (password.trim().length < 6) {
        showToast('Security requirement: Password must be at least 6 characters long')
        return
      }
    }

    if (!password.trim()) {
      showToast('Please enter your password')
      return
    }

    setIsLoading(true)
    const studentName = !isLogin && fullName.trim() ? fullName.trim() : cleanInput.split('@')[0]

    // -------------------------------------------------------------
    // FLOW 1: SIGN UP (Register a New Account)
    // -------------------------------------------------------------
    if (!isLogin) {
      // 1. Check if user already exists in Supabase database or local storage
      const dbExisting = await apiFindDatabaseUser(cleanInput)
      const existingUsers = JSON.parse(localStorage.getItem('registered_users') || '[]')
      const alreadyRegistered = dbExisting || existingUsers.some((u) => u.email?.toLowerCase().trim() === cleanInput)
      if (alreadyRegistered) {
        setIsLoading(false)
        showToast('An account with this email/ID already exists. Please switch to Sign In!')
        setIsLogin(true)
        return
      }

      // 2. Attempt Supabase Auth registration
      if (isSupabaseConfigured) {
        const { error } = await apiSignUpWithPassword(cleanInput, password, {
          name: studentName,
          full_name: studentName,
          role,
        })
        if (error) {
          const msg = error.message?.toLowerCase() || ''
          if (msg.includes('already registered') || msg.includes('user already exists')) {
            setIsLoading(false)
            showToast('An account with this email already exists. Please switch to Sign In!')
            setIsLogin(true)
            return
          }
          console.warn('Supabase signup notice:', error.message)
        }
        // Attempt sign in to create session if email confirmation is disabled
        await apiSignInWithPassword(cleanInput, password)
      }

      // 3. Save initial record into registered accounts pool locally (hashed)
      const passwordHash = await hashPassword(password)
      const newUserRecord = {
        email: cleanInput,
        password: passwordHash,
        name: studentName,
        role,
        createdAt: new Date().toISOString(),
      }
      localStorage.setItem('registered_users', JSON.stringify([...existingUsers, newUserRecord]))

      setIsLoading(false)
      setPendingSignupData({
        name: studentName,
        email: cleanInput,
        password, // Preserved so apiSaveUserProfile persists it in the Supabase database!
        role,
        rollNo: '',
        branch: 'B.Tech Computer Science & Engineering',
        sem: 'SEM 3',
        year: "'28",
        phone: '',
        interests: [],
      })
      setSetupPortalOpen(true)
      showToast('Account created! Please configure your student details.')
      return
    }

    // -------------------------------------------------------------
    // FLOW 2: SIGN IN (Strict Password Verification)
    // -------------------------------------------------------------
    let authenticatedUser = null

    // 1. Check permanent Supabase database for account (supports email OR Student ID / Roll No)
    let dbUser = null
    try {
      dbUser = await apiFindDatabaseUser(cleanInput)
    } catch (e) {
      console.warn('Database user search error:', e)
    }

    // 2. Also check local registered accounts pool
    const localUsers = JSON.parse(localStorage.getItem('registered_users') || '[]')
    const foundLocal = localUsers.find(
      (u) =>
        u.email?.toLowerCase().trim() === cleanInput ||
        (u.rollNo && u.rollNo.toLowerCase().trim() === cleanInput)
    )

    const targetAccount = dbUser || foundLocal

    // 3. Try Supabase Auth verification if Supabase is active
    if (isSupabaseConfigured) {
      const emailToAuth = targetAccount?.email || (cleanInput.includes('@') ? cleanInput : null)
      if (emailToAuth) {
        const { data: authData, error: authError } = await apiSignInWithPassword(emailToAuth, password)
        if (!authError && authData?.user) {
          const meta = authData.user.user_metadata || {}
          let profileRow = null
          try {
            const profRes = await supabase.from('profiles').select('*').eq('id', authData.user.id).maybeSingle()
            profileRow = profRes?.data
          } catch {}

          authenticatedUser = {
            id: authData.user.id,
            email: authData.user.email,
            password,
            name: profileRow?.name || meta.full_name || meta.name || targetAccount?.name || studentName,
            rollNo: profileRow?.roll_no || meta.rollNo || meta.roll_no || targetAccount?.rollNo || '',
            branch: profileRow?.branch || meta.branch || targetAccount?.branch || '',
            sem: profileRow?.sem || meta.sem || targetAccount?.sem || '',
            year: profileRow?.year || meta.year || targetAccount?.year || '',
            phone: meta.phone || targetAccount?.phone || '',
            role: profileRow?.role || meta.role || targetAccount?.role || role,
            avatar: profileRow?.avatar_url || meta.avatar || meta.avatar_url || meta.picture || targetAccount?.avatar || null,
            interests: Array.isArray(meta.interests) ? meta.interests : (targetAccount?.interests || []),
            isProfileSetup: Boolean(meta.isProfileSetup || profileRow?.roll_no || targetAccount?.rollNo),
            hasPassword: true,
          }
          apiSaveUserProfile(authenticatedUser).catch(() => {})
        } else if (authError) {
          const msg = authError.message?.toLowerCase() || ''
          if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
            // Check if stored password in database record matches
            if (targetAccount?.password) {
              const matches = await verifyPasswordHash(password, targetAccount.password)
              if (!matches) {
                setIsLoading(false)
                showToast('Incorrect password. Please enter the correct password for your account.')
                return
              }
            } else {
              // Account was created with Google OAuth without manual password
              setIsLoading(false)
              showToast('This account was created with Google Sign-In with no manual password set. Please click the Google button below to sign in.')
              return
            }
          }
        }
      }
    }

    // 4. If not authenticated via Supabase Auth, verify against targetAccount credentials
    if (!authenticatedUser) {
      if (!targetAccount) {
        setIsLoading(false)
        showToast('Account not found! You must sign up first before signing in.')
        setIsLogin(false)
        return
      }

      // Strict Password Verification with hash support:
      if (targetAccount.password) {
        const matches = await verifyPasswordHash(password, targetAccount.password)
        if (!matches) {
          setIsLoading(false)
          showToast('Incorrect password for this account. Please enter the correct password.')
          return
        }
        authenticatedUser = targetAccount
      } else {
        // Account has NO password configured (Google OAuth user with no manual password)
        setIsLoading(false)
        showToast('This account was created via Google Sign-In with no manual password set. Please click "Google" below to sign in.')
        return
      }
    }

    setIsLoading(false)
    login({
      id: authenticatedUser.id,
      role: authenticatedUser.role || role,
      email: authenticatedUser.email,
      name: authenticatedUser.name || studentName,
      rollNo: authenticatedUser.rollNo || '',
      branch: authenticatedUser.branch || '',
      sem: authenticatedUser.sem || '',
      year: authenticatedUser.year || '',
      phone: authenticatedUser.phone || '',
      avatar: authenticatedUser.avatar || null,
      interests: authenticatedUser.interests || [],
      isProfileSetup: authenticatedUser.isProfileSetup || false,
    })
    showToast(`Welcome back, ${authenticatedUser.name || 'Student'}!`)
    navigate(authenticatedUser.role === 'host' ? '/host' : '/events')
  }

  const handleCompleteSetup = async (completeData) => {
    setIsLoading(true)
    const payloadToSave = {
      ...pendingSignupData,
      ...completeData,
      password: pendingSignupData?.password || password,
      isProfileSetup: true,
    }
    // Saved permanently in Supabase database and local pool
    await apiSaveUserProfile(payloadToSave)

    login(payloadToSave)
    setIsLoading(false)
    setSetupPortalOpen(false)
    showToast(`Profile configured and saved to database! Welcome, ${payloadToSave.name}!`)
    navigate(payloadToSave.role === 'host' ? '/host' : '/events')
  }

  const handleSkipSetup = async () => {
    if (pendingSignupData) {
      const payloadToSave = {
        ...pendingSignupData,
        password: pendingSignupData?.password || password,
        isProfileSetup: false,
      }
      await apiSaveUserProfile(payloadToSave)
      login(payloadToSave)
    }
    setSetupPortalOpen(false)
    showToast('Basic profile activated and saved to database.')
    navigate('/events')
  }

  const handleProviderLogin = async (provider) => {
    if (provider === 'Google' && isSupabaseConfigured) {
      showToast('Connecting to Google Single Sign-On...')
      const { error } = await apiSignInWithGoogle()
      if (error) {
        console.warn('Supabase Google OAuth note:', error.message)
        showToast(`Google Sign-In: ${error.message}`)
      }
      return
    }

    showToast(`Redirecting to ${provider} authentication...`)
    setTimeout(() => {
      const defaultEmail = `student.${provider.toLowerCase()}@university.edu`
      const defaultName = defaultEmail.split('@')[0]

      if (!isLogin) {
        setPendingSignupData({
          role,
          email: defaultEmail,
          name: defaultName,
          rollNo: '',
          branch: 'B.Tech Computer Science & Engineering',
          sem: 'SEM 1',
          year: "'28",
        })
        setSetupPortalOpen(true)
        showToast(`Signed in with ${provider}! Please set up your student profile.`)
      } else {
        login({
          role,
          email: defaultEmail,
          name: defaultName,
        })
        showToast(`Signed in with ${provider}! Redirecting to events...`)
        navigate(role === 'host' ? '/host' : '/events')
      }
    }, 1000)
  }

  return (
    <div className="w-full flex flex-col relative bg-[#09090f]">

      {/* Fixed Backgrounds with Smooth Crossfade */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: 1 - scrollProgress }}>
          <LightTunnel />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-[#09090f]/80" />
        </div>

        <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: scrollProgress }}>
          <GradientWaves
            horizonColor="#ffffff"
            waveColor="#e2e8f0"
            crestColor="#f8fafc"
            brightness={1.3}
          />
        </div>
      </div>

      {/* Visual Hero Section (Full Screen) */}
      <div className="w-full h-[100dvh] relative z-10 flex flex-col">
        <div className="flex flex-col justify-between p-6 sm:p-12 w-full h-full text-white">
          <div className="flex items-center justify-between w-full">
            <Link to="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-4xl text-primary drop-shadow-lg">scatter_plot</span>
              <span className="font-headline text-2xl font-extrabold tracking-tight">Campus<span className="text-primary">Connect</span></span>
            </Link>

            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  <Link
                    to="/events"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-xs font-headline font-bold text-white transition-all shadow-md"
                  >
                    <span>Events Portal</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout()
                      showToast('Successfully signed out')
                    }}
                    className="inline-flex items-center px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-headline font-semibold text-white transition-all"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => scrollToAuth('Please sign in to browse events and register')}
                    className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-headline font-bold text-white transition-all shadow-sm"
                  >
                    <span>Explore Events</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                  <button
                    onClick={() => scrollToAuth()}
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-xs font-headline font-bold text-white transition-all shadow-md"
                  >
                    Sign In / Join
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full h-full items-center justify-center">
            <div style={{ width: '100%', height: 360 }}>
              <ParticleText
                text="Campus Connect"
                particleSize={2}
                density={4}
                color="#ffffff"
                highlightColor="#8b5cf6"
                scatter={180}
                gatherDuration={2500}
                stagger={420}
                pointerRepel={40}
                repelRadius={120}
                idleDrift={0.7}
                trigger="mount"
                fontSize="clamp(4rem, 12vw, 8rem)"
                fontWeight={800}
                fontFamily="inherit"
                glow
              />
            </div>
            <div className="flex flex-col items-center gap-6 -mt-16 text-center max-w-lg mx-auto min-h-[140px]">
              {showTagline && (
                <>
                  <SplitText
                    text="Unlock Your Campus Experience."
                    className="text-[3rem] font-extrabold tracking-tight leading-tight"
                    delay={100}
                    duration={0.6}
                    ease="power3.out"
                    splitType="words, chars"
                    from={{ opacity: 0, y: 40 }}
                    to={{ opacity: 1, y: 0 }}
                    threshold={0.1}
                    rootMargin="-100px"
                    textAlign="center"
                  />
                  <p className="text-surface-container-highest text-xl font-medium max-w-md animate-fade-in" style={{ animationDelay: '800ms', animationFillMode: 'both' }}>
                    One unified portal for events, hackathons, verifiable passes, and community networking.
                  </p>
                  <div className="flex items-center gap-4 mt-2 animate-fade-in" style={{ animationDelay: '1000ms', animationFillMode: 'both' }}>
                    {isLoggedIn ? (
                      <Link
                        to="/events"
                        className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark font-headline text-sm font-bold text-white shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <span>Go to Events Discovery</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </Link>
                    ) : (
                      <>
                        <button
                          onClick={() => scrollToAuth()}
                          className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark font-headline text-sm font-bold text-white shadow-lg shadow-primary/30 active:scale-95 transition-all"
                        >
                          Get Started
                        </button>
                        <button
                          onClick={() => scrollToAuth('Please sign in or create an account to browse events')}
                          className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 font-headline text-sm font-bold text-white active:scale-95 transition-all"
                        >
                          Browse Events
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-surface-container-highest font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              SYSTEMS NOMINAL // NODE ONLINE
            </div>
            <button
              onClick={() => scrollToAuth()}
              className="hidden sm:flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <span>Scroll to Login</span>
              <span className="material-symbols-outlined text-sm animate-bounce">expand_more</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auth Form Section */}
      <div id="auth-section" className="w-full min-h-[100dvh] flex flex-col justify-center items-center p-6 md:p-12 relative z-10">

        <div className="w-full max-w-md flex flex-col gap-8 bg-white/70 backdrop-blur-2xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/50">

          <div className="flex flex-col gap-2 text-center md:text-left">
            <h2 className="font-headline text-3xl text-on-surface font-extrabold tracking-tight">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-on-surface-variant text-sm">
              {isLogin ? 'Enter your credentials to access the portal' : 'Join the campus ecosystem today'}
            </p>
          </div>

          <div className="flex p-1 bg-white-container-low rounded-xl border border-outline-variant">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex-1 py-2 text-sm font-headline font-bold rounded-lg transition-all ${role === 'student' ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setRole('host')}
              className={`flex-1 py-2 text-sm font-headline font-bold rounded-lg transition-all ${role === 'host' ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Organizer / Host
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider pl-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-white-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-on-surface-variant/50"
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider pl-1">
                {isLogin ? 'University Email or Student ID / Roll No' : 'University Email'}
              </label>
              <input
                type={isLogin ? 'text' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isLogin ? 'e.g. 24BCS1002 or student@university.edu' : 'student@university.edu'}
                className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-white-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-on-surface-variant/50"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between pl-1">
                <label className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider">Password</label>
                {isLogin && <button type="button" className="font-headline text-xs text-primary font-bold hover:underline">Forgot?</button>}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-white-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-on-surface-variant/50"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-2 rounded-xl bg-on-surface hover:bg-black text-white font-headline text-sm font-bold flex items-center justify-center shadow-md active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? 'Sign In Securely' : 'Create Account'
              )}
            </button>
          </form>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-outline-variant"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-headline font-bold text-on-surface-variant uppercase tracking-wider">Or continue with</span>
            <div className="flex-grow border-t border-outline-variant"></div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => handleProviderLogin('Google')}
              className="py-2.5 rounded-xl border border-outline-variant bg-white hover:bg-white-container-low text-on-surface font-headline text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
              Google
            </button>
          </div>

          <p className="text-center text-sm text-on-surface-variant mt-4">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-bold hover:underline font-headline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

        </div>
      </div>

      {/* Onboarding Profile Setup Portal */}
      <ProfileSetupModal
        isOpen={setupPortalOpen}
        initialData={pendingSignupData || {}}
        onComplete={handleCompleteSetup}
        onSkip={handleSkipSetup}
      />

    </div>
  )
}
