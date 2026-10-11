import { useState, useEffect } from 'react'
import { useToast } from '../components/Toast'
import { apiGetPasses, subscribeToRealtime } from '../lib/supabase'

export default function MyPasses() {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [qrExpanded, setQrExpanded] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [dynamicPasses, setDynamicPasses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user_registered_passes') || '[]')
    } catch {
      return []
    }
  })
  const showToast = useToast()

  useEffect(() => {
    let isMounted = true

    const syncPasses = async () => {
      try {
        const passes = await apiGetPasses()
        if (isMounted && Array.isArray(passes) && passes.length > 0) {
          setDynamicPasses(passes)
        } else if (isMounted) {
          const stored = JSON.parse(localStorage.getItem('user_registered_passes') || '[]')
          setDynamicPasses(Array.isArray(stored) ? stored : [])
        }
      } catch (e) {
        console.error(e)
      }
    }

    syncPasses()
    const unsub = subscribeToRealtime('passes', syncPasses)
    window.addEventListener('event-updated', syncPasses)
    window.addEventListener('storage', syncPasses)

    return () => {
      isMounted = false
      unsub()
      window.removeEventListener('event-updated', syncPasses)
      window.removeEventListener('storage', syncPasses)
    }
  }, [])

  const handleQrTap = () => {
    showToast('Pass Ready: Brightness auto-boosted for scanner')
  }

  const handleAction = (action) => {
    switch (action) {
      case 'wallet': showToast('Synced with Device Digital Wallet'); break
      case 'pdf': showToast('Generating cryptographic PDF ticket...'); break
      case 'share': showToast('Pass secure link copied to clipboard'); break
      case 'copy-hash': showToast('Verification signature copied'); break
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 animate-fade-in pb-24 lg:pb-6">
      <div className="flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-headline text-[11px] text-primary uppercase tracking-wider font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Telemetry Authenticated
              </span>
              <h2 className="font-headline text-2xl text-on-surface font-extrabold tracking-tight mt-0.5">My Passes</h2>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-black/[0.04] border border-black/10 flex items-center gap-1.5 backdrop-blur-sm">
              <span className="material-symbols-outlined text-black/70 text-[15px]">verified_user</span>
              <span className="font-headline text-[11px] text-black font-bold tracking-wide">CAMPUS ID PASS</span>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant">Active Event Access & Scannable QR Badges</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'upcoming', label: 'Upcoming & Active', count: 2 + dynamicPasses.length },
            { id: 'concluded', label: 'Concluded', count: 4 },
            { id: 'archived', label: 'Archived', count: 0 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full font-headline text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-on-surface-variant border border-outline-variant hover:text-on-surface'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.id ? 'bg-outline/20 text-white' : 'bg-white-container text-on-surface-variant'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Hero Pass */}
        {activeTab === 'upcoming' && (
          <div className="w-full relative [perspective:1000px] mb-8 group">
            <div className={`relative w-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
              
              {/* Front of Card */}
              <div className="w-full rounded-2xl bg-white border border-outline-variant shadow-sm overflow-hidden [backface-visibility:hidden] flex flex-col cursor-pointer" onClick={() => setIsFlipped(true)}>
                <div className="h-1.5 w-full bg-primary" />
                <div className="p-4 sm:p-5 flex flex-col items-center justify-center gap-4">
                  
                  <div className="w-full flex items-center justify-between flex-wrap gap-2">
                    <div className="px-2.5 py-0.5 rounded-full bg-white-container-low border border-outline-variant text-on-surface-variant font-headline text-[11px] font-bold">
                      UNIT #409
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/5 border border-black/10 text-black font-headline text-[11px] font-bold backdrop-blur-sm">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      CONFIRMED
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <h3 className="font-headline text-lg sm:text-xl text-on-surface font-bold leading-tight">
                      HackCU 2026: 24-Hour AI Prototype Build
                    </h3>
                  </div>

                  {/* QR Area */}
                  <div className="bg-white-container-low border border-outline-variant/70 rounded-xl p-5 flex flex-col items-center justify-center gap-3 relative w-full">
                    <div className="absolute top-3 right-3 font-mono text-[11px] text-primary font-bold tracking-wider">GATE // 03-ALPHA</div>
                    
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQrTap();
                      }}
                      className="p-3 bg-white rounded-xl border border-outline-variant shadow-sm flex flex-col items-center relative hover:scale-[1.02] transition-transform active:ring-2 active:ring-primary/50"
                    >
                      <svg className="w-32 h-32 sm:w-40 sm:h-40" fill="none" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
                        <rect fill="#0f172a" height="35" rx="3" width="35" x="10" y="10" />
                        <rect fill="white" height="21" rx="2" width="21" x="17" y="17" />
                        <rect fill="#0f172a" height="11" width="11" x="22" y="22" />
                        <rect fill="#0f172a" height="35" rx="3" width="35" x="95" y="10" />
                        <rect fill="white" height="21" rx="2" width="21" x="102" y="17" />
                        <rect fill="#0f172a" height="11" width="11" x="107" y="22" />
                        <rect fill="#0f172a" height="35" rx="3" width="35" x="10" y="95" />
                        <rect fill="white" height="21" rx="2" width="21" x="17" y="102" />
                        <rect fill="#0f172a" height="11" width="11" x="22" y="107" />
                        <rect fill="#0f172a" height="7" width="7" x="52" y="12" />
                        <rect fill="#0f172a" height="14" width="7" x="65" y="12" />
                        <rect fill="#0f172a" height="7" width="14" x="52" y="28" />
                        <rect fill="#0f172a" height="12" width="12" x="12" y="52" />
                        <rect fill="#0f172a" height="7" width="14" x="30" y="52" />
                        <rect fill="#4338ca" fillOpacity="0.1" height="40" rx="4" width="40" x="50" y="50" />
                        <rect fill="#0f172a" height="10" width="10" x="56" y="56" />
                        <rect fill="#0f172a" height="10" width="10" x="74" y="56" />
                        <rect fill="#0f172a" height="10" width="10" x="65" y="72" />
                        <rect fill="#0f172a" height="14" width="8" x="52" y="98" />
                        <rect fill="#0f172a" height="10" width="22" x="52" y="120" />
                        <rect fill="#0f172a" height="12" width="14" x="100" y="118" />
                      </svg>
                      <div className="absolute -bottom-2.5 px-2 py-0.5 rounded-full bg-white border border-outline-variant text-primary font-mono text-[10px] font-bold flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        LIVE TELEMETRY
                      </div>
                    </div>
                    <span className="text-xs text-on-surface-variant text-center pt-2">Scan at check-in kiosk on arrival</span>
                  </div>

                  <div className="mt-2 text-primary font-bold text-sm flex items-center gap-1 group-hover:underline transition-all">
                    <span className="material-symbols-outlined text-[18px]">flip</span>
                    Tap to see Event Details
                  </div>
                </div>
              </div>

              {/* Back of Card */}
              <div className="w-full h-full absolute inset-0 rounded-2xl bg-white border border-outline-variant shadow-sm overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col">
                <div className="h-1.5 w-full bg-primary" />
                <div className="p-4 sm:p-5 flex flex-col justify-between h-full gap-4">
                  
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-headline text-lg sm:text-xl text-on-surface font-bold leading-tight">
                        Event Details
                      </h3>
                      <button 
                        onClick={() => setIsFlipped(false)}
                        className="p-1 rounded-full hover:bg-black/5 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-3 text-on-surface-variant text-sm bg-background p-4 rounded-xl border border-outline-variant">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
                        <div>
                          <div className="font-bold text-on-surface">Sat, Nov 15 • 09:00 AM IST</div>
                          <div className="text-xs">24-Hour AI Prototype Build Event</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
                        <div>
                          <div className="font-bold text-on-surface">IoT Lab, Academic Block 3</div>
                          <div className="text-xs">Terminal Alpha, Main Campus</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pass Holder */}
                  <div className="rounded-xl bg-white-container-low border border-outline-variant p-3 grid grid-cols-2 gap-2 text-xs mt-auto">
                    <div>
                      <span className="font-headline text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">Pass Holder</span>
                      <span className="font-headline text-[13px] text-on-surface font-bold truncate block">Aarav Sharma</span>
                    </div>
                    <div>
                      <span className="font-headline text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">University ID</span>
                      <span className="font-mono text-[12px] text-primary font-bold block">22BCS10842</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-outline-variant flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[16px]">groups</span>
                        <span className="text-on-surface-variant text-[11px]">Designated Team:</span>
                        <span className="text-on-surface font-bold text-[11px]">Team AlphaSync</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-tertiary bg-tertiary-container/50 border border-tertiary/20 px-1.5 py-0.5 rounded">TIER 1 ACCESS</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                    <button 
                      onClick={() => handleAction('wallet')}
                      className="sm:col-span-1 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-headline text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[17px]">account_balance_wallet</span>
                      <span>Add to Wallet</span>
                    </button>
                    <button 
                      onClick={() => handleAction('pdf')}
                      className="py-2.5 px-3 rounded-xl bg-white hover:bg-white-container-low border border-outline-variant text-on-surface font-headline text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[17px] text-primary">download</span>
                      <span>Get PDF</span>
                    </button>
                    <button 
                      onClick={() => handleAction('share')}
                      className="py-2.5 px-3 rounded-xl bg-white hover:bg-white-container-low border border-outline-variant text-on-surface font-headline text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[17px] text-primary">share</span>
                      <span>Share</span>
                    </button>
                  </div>
                  
                  <div className="w-full flex justify-center mt-1">
                    <button 
                      onClick={() => setIsFlipped(false)}
                      className="text-primary font-bold text-xs flex items-center gap-1 hover:underline transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">flip</span>
                      Tap to flip back
                    </button>
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

        {/* Dynamic Registered Passes */}
        {activeTab === 'upcoming' && dynamicPasses.map((dp) => (
          <div key={dp.id} className="w-full rounded-2xl bg-white border border-outline-variant shadow-sm p-4 sm:p-5 flex flex-col gap-3 animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-headline text-[10px] font-bold">
                    {dp.id}
                  </span>                  <span className="px-2.5 py-0.5 rounded-full bg-black/5 text-black font-headline text-[10px] font-bold">
                    CONFIRMED
                  </span>
                </div>
                <h4 className="font-headline text-base text-on-surface font-bold leading-tight">{dp.eventTitle}</h4>
                <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary">calendar_today</span>
                  {dp.date} • {dp.venue}
                </p>
                <div className="text-[11px] text-on-surface-variant font-mono mt-1">
                  Attendee: <strong className="text-on-surface">{dp.participantName}</strong> ({dp.rollNo})
                  {dp.teamName && ` • Team: ${dp.teamName}`}
                </div>
              </div>

              <div 
                onClick={handleQrTap}
                className="flex-shrink-0 bg-white p-2 rounded-xl border border-outline-variant shadow-sm flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                title="Tap to enlarge QR"
              >
                <svg className="w-14 h-14" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <rect fill="#0f172a" height="30" width="30" x="5" y="5" />
                  <rect fill="white" height="20" width="20" x="10" y="10" />
                  <rect fill="#0f172a" height="10" width="10" x="15" y="15" />
                  <rect fill="#0f172a" height="30" width="30" x="65" y="5" />
                  <rect fill="white" height="20" width="20" x="70" y="10" />
                  <rect fill="#0f172a" height="15" width="15" x="10" y="42" />
                  <rect fill="#0f172a" height="22" width="22" x="70" y="70" />
                </svg>
                <span className="text-[8px] font-mono text-primary font-bold mt-1">SCANNABLE</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-outline-variant/50 text-xs">
              <span className="text-on-surface-variant font-mono text-[11px]">
                Verified Gate Entry Access
              </span>
              <button
                onClick={() => showToast('Pass token saved to offline wallet')}
                className="px-3 py-1 rounded-lg bg-white-container-low hover:bg-primary-container text-on-surface font-headline text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">download</span>
                Save Offline
              </button>
            </div>
          </div>
        ))}

        {/* Mini Pass */}
        {activeTab === 'upcoming' && (
          <div className="w-full rounded-2xl bg-white border border-outline-variant shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-white-container-low border border-outline-variant text-on-surface-variant font-headline text-[10px] font-bold">ROW F-12</span>
                </div>
                <h4 className="font-headline text-[15px] text-on-surface font-bold leading-tight">Hands-on Quantum Computing Primer</h4>
                <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary">calendar_today</span>
                  Oct 28 • 2:00 PM • Audi B1
                </p>
              </div>
              
              <div className="flex-shrink-0 bg-white p-1.5 rounded-xl border border-outline-variant shadow-sm flex flex-col items-center">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <rect fill="#0f172a" height="30" width="30" x="5" y="5" />
                  <rect fill="white" height="20" width="20" x="10" y="10" />
                  <rect fill="#0f172a" height="10" width="10" x="15" y="15" />
                  <rect fill="#0f172a" height="30" width="30" x="65" y="5" />
                  <rect fill="white" height="20" width="20" x="70" y="10" />
                  <rect fill="#0f172a" height="15" width="15" x="10" y="42" />
                  <rect fill="#0f172a" height="22" width="22" x="70" y="70" />
                </svg>
              </div>
            </div>
            
            <div className="pt-2 flex items-center justify-between border-t border-outline-variant/50">
              <div className="flex items-center gap-1.5 text-on-surface">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                <span className="font-headline text-[11px] font-bold uppercase">Pre-Checkin Open</span>
              </div>
              <button 
                onClick={() => setQrExpanded(!qrExpanded)}
                className="px-3 py-1 rounded-lg bg-white-container-low hover:bg-white-container text-on-surface font-headline text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <span>{qrExpanded ? 'Collapse QR' : 'Expand QR'}</span>
                <span className="material-symbols-outlined text-[16px]">{qrExpanded ? 'expand_less' : 'expand_more'}</span>
              </button>
            </div>

            {qrExpanded && (
              <div className="flex flex-col items-center pt-3 gap-2 animate-slide-up border-t border-outline-variant/50">
                <div className="p-3 bg-white rounded-xl border border-outline-variant shadow-md">
                   <svg className="w-32 h-32" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <rect fill="#0f172a" height="30" width="30" x="5" y="5" />
                    <rect fill="white" height="20" width="20" x="10" y="10" />
                    <rect fill="#0f172a" height="10" width="10" x="15" y="15" />
                    <rect fill="#0f172a" height="30" width="30" x="65" y="5" />
                    <rect fill="white" height="20" width="20" x="70" y="10" />
                    <rect fill="#0f172a" height="10" width="10" x="75" y="15" />
                    <rect fill="#0f172a" height="30" width="30" x="5" y="65" />
                    <rect fill="white" height="20" width="20" x="10" y="70" />
                    <rect fill="#0f172a" height="10" width="10" x="15" y="75" />
                  </svg>
                </div>
                <p className="font-mono text-xs text-primary font-bold">PASS_UID // QC-8809-B1</p>
              </div>
            )}
          </div>
        )}

        {/* Security Info */}
        <div className="w-full rounded-2xl bg-white border border-outline-variant p-4 flex flex-col gap-3 shadow-sm mt-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-[19px]">security</span>
              <span className="font-headline text-xs uppercase tracking-wider text-on-surface font-bold">Cryptographic Protocol</span>
            </div>
          </div>
          
          <div className="p-2 rounded-lg bg-white-container-low border border-outline-variant flex items-center justify-between font-mono text-[11px] text-on-surface-variant mt-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-primary font-bold">HASH:</span>
              <span className="truncate">0x8F9C...E4A02B199D20A1</span>
            </div>
            <button 
              onClick={() => handleAction('copy-hash')}
              className="text-on-surface-variant hover:text-primary ml-2 flex-shrink-0 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">content_copy</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
