import { useState, useEffect } from 'react'
import { useToast } from '../components/Toast'
import { useUser } from '../context/UserContext'
import { apiGetCertificates } from '../lib/supabase'
import CircularGallery from '../components/ReactBits/CircularGallery/CircularGallery'

export default function CertificatesVault() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewCert, setPreviewCert] = useState(null)
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)
  const showToast = useToast()
  const { user } = useUser()

  const loadCertificates = async () => {
    setLoading(true)
    try {
      const realCerts = await apiGetCertificates(user)
      setCertificates(Array.isArray(realCerts) ? realCerts : [])
    } catch (e) {
      console.warn('Failed to load certificates:', e)
      setCertificates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCertificates()
    const handleSync = () => loadCertificates()
    window.addEventListener('storage', handleSync)
    window.addEventListener('certificate-issued', handleSync)
    window.addEventListener('event-updated', handleSync)
    return () => {
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('certificate-issued', handleSync)
      window.removeEventListener('event-updated', handleSync)
    }
  }, [user?.email, user?.rollNo])

  const handleAction = (action, cert) => {
    switch (action) {
      case 'download':
        showToast(`Preparing printable PDF for ${cert.title}...`)
        setPreviewCert(cert)
        setTimeout(() => {
          window.print()
        }, 500)
        break
      case 'linkedin':
        showToast(`Opening LinkedIn Add-to-Profile for ${cert.title}...`)
        break
      case 'verify':
        navigator.clipboard?.writeText?.(
          `https://campusconnect.cu.edu/verify/${cert.credentialId}`
        )
        showToast(`Verification link copied: ${cert.credentialId}`)
        break
      case 'preview':
        setPreviewCert(cert)
        break
    }
  }

  const filterTabs = [
    { id: 'all', label: 'All Credentials' },
    { id: 'achievement', label: 'Achievements' },
    { id: 'participation', label: 'Participation' },
    { id: 'award', label: 'Awards' }
  ]

  const filteredCerts = certificates.filter(c => {
    const matchesFilter = activeFilter === 'all' || c.type === activeFilter
    const matchesSearch = searchQuery.trim() === '' ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.issuer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.credentialId.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const galleryItems = certificates.map(cert => ({
    image: cert.certificateImage || cert.image,
    text: cert.title
  }))

  const getTypeBadge = (type) => {
    switch (type) {
      case 'achievement':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Achievement'
        }
      case 'award':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Award'
        }
      default:
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
          label: 'Participation'
        }
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in pb-24 lg:pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* Left Side: Circular 3D Gallery or Digital Credential Safe */}
        <div className="w-full h-[420px] lg:h-[700px] relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#18181b] to-[#09090b] shadow-xl border border-outline-variant flex flex-col justify-between p-6">
          {/* Top Overlay Badge */}
          <div className="flex items-center justify-between z-10">
            <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white font-headline text-xs font-semibold flex items-center gap-2 shadow-md">
              <span className={`w-2 h-2 rounded-full ${certificates.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{certificates.length > 0 ? '3D Credential Showcase' : 'Verifiable Credential Safe'}</span>
            </div>

            <div className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] text-white/80 font-mono">
              {certificates.length} Stored
            </div>
          </div>

          {certificates.length > 0 ? (
            /* 3D WebGL Cylinder Gallery */
            <div className="absolute inset-0 pt-12">
              <CircularGallery
                items={galleryItems}
                bend={3}
                textColor="#ffffff"
                borderRadius={0.05}
                scrollEase={0.02}
                fontUrl="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap"
                font="bold 20px Orbitron"
              />
              <div className="absolute bottom-4 inset-x-4 z-10 flex justify-center pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] text-white/80 border border-white/10 shadow-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-primary-container">swipe</span>
                  Drag horizontally to inspect 3D credentials
                </span>
              </div>
            </div>
          ) : (
            /* Empty State Holographic Safe */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10">
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-primary/20 to-emerald-500/20 border border-white/20 flex items-center justify-center shadow-2xl mb-4 group">
                <div className="absolute inset-0 rounded-3xl bg-amber-400/10 blur-xl animate-pulse" />
                <span className="material-symbols-outlined text-white text-4xl drop-shadow-md">verified_user</span>
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-headline text-[9px] font-black uppercase tracking-wider shadow">
                  Encrypted
                </div>
              </div>

              <h3 className="font-headline text-lg sm:text-xl font-bold text-white tracking-tight">
                Verifiable Credential Safe
              </h3>
              <p className="text-xs text-white/60 max-w-xs mt-1.5 leading-relaxed">
                Certificates in your vault are cryptographically generated and issued by organizers upon verified event completion and check-in.
              </p>

              <div className="mt-5 flex flex-col gap-2 w-full max-w-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 text-left">
                  <span className="material-symbols-outlined text-emerald-400 text-[20px]">how_to_reg</span>
                  <div className="text-[11px]">
                    <p className="text-white font-semibold">1. Attend & Check In</p>
                    <p className="text-white/50 text-[10px]">Host confirms your attendance at the venue</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 text-left">
                  <span className="material-symbols-outlined text-amber-400 text-[20px]">workspace_premium</span>
                  <div className="text-[11px]">
                    <p className="text-white font-semibold">2. Auto-Mint Certificate</p>
                    <p className="text-white/50 text-[10px]">Your name and student UID are embedded</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Footer Info */}
          <div className="z-10 text-[10px] text-white/40 font-mono text-center pt-2">
            CampusConnect Verification Engine • Node #CU-MAIN
          </div>
        </div>

        {/* Right Side: Vault Content */}
        <div className="w-full flex flex-col gap-4 lg:h-[700px] min-w-0">

          {/* Header Section (Fixed, shrink-0) */}
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-headline text-[11px] text-tertiary uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  Immutable Ledger • Cryptographically Signed
                </span>
                <h2 className="font-headline text-2xl text-on-surface font-extrabold tracking-tight mt-0.5">Certificates Vault</h2>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-tertiary-container border border-tertiary/20 flex items-center justify-center text-tertiary shadow-sm">
                <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Verified records of awards, hackathon qualifications, and leadership certificates registered under your student ID.
            </p>

            {/* Live Search Bar */}
            <div className="relative w-full mt-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
              <input
                type="text"
                placeholder="Search certificates by title, partner, or credential ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface placeholder:text-on-surface-variant/60 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs (Fixed, shrink-0 with explicit height and pill geometry) */}
          <div className="shrink-0 flex items-center gap-2 overflow-x-auto py-1 no-scrollbar border-b border-outline-variant/60 pb-3">
            {filterTabs.map(filter => {
              const count = filter.id === 'all'
                ? certificates.length
                : certificates.filter(c => c.type === filter.id).length
              const isActive = activeFilter === filter.id

              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  type="button"
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-headline text-xs font-bold transition-all whitespace-nowrap leading-none border shadow-xs cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-on-surface-variant border-outline-variant hover:border-slate-300 hover:text-on-surface hover:bg-slate-50'
                  }`}
                >
                  <span>{filter.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-on-surface-variant'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Scrollable Certificates List Area */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-1 pb-6">
            {filteredCerts.map(cert => {
              const badge = getTypeBadge(cert.type)

              return (
                <div
                  key={cert.id}
                  className="w-full rounded-2xl bg-white border border-outline-variant shadow-xs overflow-hidden flex flex-col group transition-all hover:shadow-md hover:border-outline"
                >
                  {/* Card Banner */}
                  <div
                    onClick={() => handleAction('preview', cert)}
                    className="h-32 w-full relative overflow-hidden cursor-pointer"
                  >
                    <img
                      src={cert.image}
                      alt={cert.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${badge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>

                      {cert.verified && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md border border-emerald-400/40 text-emerald-300 font-headline text-[10px] font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-emerald-400">verified</span>
                          VERIFIED
                        </span>
                      )}
                    </div>

                    {/* Banner Title */}
                    <div className="absolute bottom-2.5 left-3.5 right-3.5 text-white">
                      <h3 className="font-headline text-sm font-bold leading-snug drop-shadow-sm flex items-center justify-between">
                        <span className="line-clamp-1">{cert.title}</span>
                        <span className="material-symbols-outlined text-[18px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                          visibility
                        </span>
                      </h3>
                    </div>
                  </div>

                  {/* Card Content & Details */}
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-on-surface font-semibold">{cert.issuer}</span>
                        <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">calendar_month</span>
                          Issued {cert.date}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-[10px] text-primary bg-primary-container px-2 py-0.5 rounded-md border border-primary/20 block font-semibold">
                          {cert.credentialId}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                      {cert.description}
                    </p>

                    {/* Action Bar */}
                    <div className="grid grid-cols-4 gap-1.5 pt-2.5 border-t border-outline-variant/60">
                      <button
                        onClick={() => handleAction('preview', cert)}
                        type="button"
                        className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl hover:bg-slate-100 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                        title="View Certificate"
                      >
                        <span className="material-symbols-outlined text-[17px]">visibility</span>
                        <span className="font-headline text-[9px] font-bold uppercase tracking-wider">Preview</span>
                      </button>

                      <button
                        onClick={() => handleAction('download', cert)}
                        type="button"
                        className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl hover:bg-slate-100 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        title="Download PDF"
                      >
                        <span className="material-symbols-outlined text-[17px]">download</span>
                        <span className="font-headline text-[9px] font-bold uppercase tracking-wider">Download</span>
                      </button>

                      <button
                        onClick={() => handleAction('linkedin', cert)}
                        type="button"
                        className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl hover:bg-slate-100 text-on-surface-variant hover:text-[#0a66c2] transition-colors cursor-pointer"
                        title="Add to LinkedIn"
                      >
                        <span className="material-symbols-outlined text-[17px]">share</span>
                        <span className="font-headline text-[9px] font-bold uppercase tracking-wider">LinkedIn</span>
                      </button>

                      <button
                        onClick={() => handleAction('verify', cert)}
                        type="button"
                        className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl hover:bg-slate-100 text-on-surface-variant hover:text-tertiary transition-colors cursor-pointer"
                        title="Copy Verification Link"
                      >
                        <span className="material-symbols-outlined text-[17px]">link</span>
                        <span className="font-headline text-[9px] font-bold uppercase tracking-wider">Copy Link</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {filteredCerts.length === 0 && (
              <div className="flex-1 min-h-[320px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-outline-variant shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mb-3.5 shadow-inner">
                  <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                </div>
                <h3 className="font-headline text-base font-bold text-on-surface">No Event Certificates Yet</h3>
                <p className="text-xs text-on-surface-variant max-w-sm mt-1 leading-relaxed">
                  Only certificates provided by real campus events and verified check-ins will appear in your vault. Join upcoming events to earn verifiable credentials!
                </p>
                <a
                  href="/events"
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-headline text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">explore</span>
                  <span>Explore Live Events</span>
                </a>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Certificate High-Fidelity Preview Modal */}
      {previewCert && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#faf8f5] rounded-3xl border-4 border-amber-600/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Modal Top Bar */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-[20px]">workspace_premium</span>
                <span className="font-headline text-xs font-bold uppercase tracking-wider">Official Verified Credential</span>
              </div>
              <button
                onClick={() => setPreviewCert(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Scrollable Certificate Paper */}
            <div className="p-8 sm:p-10 overflow-y-auto flex flex-col items-center text-center relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">

              {/* Decorative Corner Borders */}
              <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-amber-600/40 pointer-events-none" />
              <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-amber-600/40 pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-amber-600/40 pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-amber-600/40 pointer-events-none" />

              {/* Institutional Header */}
              <div className="flex flex-col items-center gap-1 mb-4">
                {previewCert.certificateImage ? (
                  <div className="w-16 h-16 rounded-2xl bg-white border border-amber-400/50 p-1.5 flex items-center justify-center shadow-md mb-1 animate-scale-up">
                    <img
                      src={previewCert.certificateImage}
                      alt="Official Verified Seal"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 shadow-inner">
                    <span className="material-symbols-outlined text-[28px]">school</span>
                  </div>
                )}
                <h4 className="font-headline text-xs uppercase tracking-widest text-slate-500 font-bold mt-1">
                  Chandigarh University • Office of Student Records
                </h4>
                <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                  {previewCert.title?.includes('Certificate') ? previewCert.title : 'Certificate of Recognition'}
                </h2>
                <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mt-2 mb-1" />
              </div>

              {/* Recipient Details */}
              <p className="text-xs text-slate-500 italic uppercase tracking-wider mb-2">This is to proudly certify that</p>
              <h3 className="font-headline text-xl sm:text-2xl font-black text-slate-900 border-b-2 border-slate-300 pb-1 px-4 inline-block">
                {previewCert.participantName || user?.name || user?.email?.split('@')[0] || 'Registered Scholar'}
              </h3>
              <p className="text-[11px] font-mono text-slate-500 mt-1">
                Student ID: {previewCert.rollNo || user?.rollNo || 'Not Specified'} • {user?.branch || 'General Academic'}
              </p>

              {/* Event & Purpose */}
              <div className="my-5 max-w-lg">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  has demonstrated exemplary commitment and successfully completed all requirements for
                </p>
                <p className="font-headline text-base sm:text-lg font-bold text-slate-900 mt-1 text-primary">
                  {previewCert.eventTitle || previewCert.title}
                </p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {previewCert.description}
                </p>
              </div>

              {/* Cryptographic Ledger & Issuer Signatures */}
              <div className="w-full pt-6 mt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center text-left">
                {/* Ledger Verification */}
                <div className="p-3 rounded-xl bg-white/80 border border-slate-200 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-headline text-[11px] font-bold">
                    <span className="material-symbols-outlined text-[15px]">verified</span>
                    <span>Immutable Hash Verification</span>
                  </div>
                  <span className="font-mono text-[9px] text-slate-600 truncate">
                    ID: {previewCert.credentialId}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 truncate">
                    HASH: {previewCert.hash}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Timestamp: {previewCert.date} • Verified Node #CU-77
                  </span>
                </div>

                {/* Authority Signature */}
                <div className="flex flex-col items-center sm:items-end justify-center text-center sm:text-right pr-2">
                  <div className="font-serif italic text-base text-slate-800 font-bold border-b border-slate-400 pb-0.5 px-4">
                    {previewCert.signatory || 'Dr. Sanjeev Khosla'}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 mt-0.5">Dean / Authorized Convener</span>
                  <span className="text-[10px] text-slate-500">{previewCert.issuer}</span>
                </div>
              </div>

            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                {previewCert.credentialId}
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleAction('verify', previewCert)}
                  type="button"
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  <span>Share Verification</span>
                </button>
                <button
                  onClick={() => handleAction('download', previewCert)}
                  type="button"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
