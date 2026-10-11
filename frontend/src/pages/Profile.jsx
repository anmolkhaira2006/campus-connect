import { useState, useRef } from 'react'
import { useToast } from '../components/Toast'
import { useUser } from '../context/UserContext'
import Avatar from '../components/Avatar'
import DitherVeil from '../components/ReactBits/DitherVeil/DitherVeil'
import CursorGrid from '../components/ReactBits/CursorGrid/CursorGrid'
import ProfileSetupModal from '../components/ProfileSetupModal'
import { validateImageFile } from '../lib/imageValidator'

export default function Profile() {
  const showToast = useToast()
  const { user, setAvatar, logout, updateUser } = useUser()
  const [notifications, setNotifications] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const fileInputRef = useRef(null)

  const handleLogout = () => {
    showToast('Securely logging out...')
    setTimeout(() => {
      logout()
      window.location.href = '/'
    }, 1000)
  }

  const handleEdit = () => {
    setEditModalOpen(true)
  }

  const handleSaveProfile = (updatedData) => {
    updateUser(updatedData)
    showToast('Profile credentials and preferences updated!')
    setEditModalOpen(false)
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const check = validateImageFile(file)
      if (!check.valid) {
        showToast(check.error)
        e.target.value = ''
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => setAvatar(e.target.result)
      reader.readAsDataURL(file)
      showToast(`Profile picture updated (${check.sizeKb} KB)`)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in pb-24 lg:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* Left Side: DitherVeil + CursorGrid overlay */}
        <div className="w-full h-[340px] lg:h-[680px] relative rounded-3xl overflow-hidden shadow-md border border-outline-variant">
          {/* DitherVeil base layer */}
          <div className="absolute inset-0 bg-[#0a0a0c]">
            <DitherVeil
              src={user.avatar || "/avatar-dither.png"}
              fit="cover"
              pattern="floyd"
              pixelSize={2}
              inkColor="#0a0a0c"
              paperColor="#f5f3ee"
              revealRadius={190}
              softness={0.6}
              linger={1.3}
              rimColor="#c084fc"
              rim={0.12}
              contrast={1.3}
              wander
            />
          </div>
          {/* CursorGrid overlay — activates on pointer interaction */}
          <div className="absolute inset-0 pointer-events-none">
            <CursorGrid
              cellSize={60}
              color="#a855f7"
              radius={130}
              falloff="smooth"
              holdTime={350}
              fadeDuration={700}
              lineWidth={1}
              maxOpacity={0.7}
              fillOpacity={0.04}
              gridOpacity={0.04}
              cellRadius={4}
              clickPulse
              pulseSpeed={550}
            />
          </div>
          {/* Profile identity badge pinned to bottom */}
          <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end gap-3">
            <div className="relative shrink-0">
              <div className="rounded-full border-2 border-white/40 overflow-hidden shadow-lg bg-black">
                <Avatar size="w-14 h-14" textSize="text-xl" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-tertiary border-2 border-white flex items-center justify-center shadow">
                <span className="material-symbols-outlined text-white text-[10px]">verified</span>
              </div>
            </div>
            <div className="text-white">
              <p className="font-headline font-bold text-base leading-tight drop-shadow">{user.name}</p>
              <p className="text-xs text-white/70 font-medium">{user.branch} {user.year} · {user.sem}</p>
            </div>
          </div>
        </div>

        {/* Right Side: Profile content */}
        <div className="flex flex-col gap-6 lg:h-[680px] overflow-y-auto pb-10">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-headline text-[11px] text-primary uppercase tracking-wider font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Student Portal
              </span>
              <h2 className="font-headline text-2xl text-on-surface font-extrabold tracking-tight mt-0.5">My Profile</h2>
            </div>
            <button
              onClick={handleEdit}
              className="w-9 h-9 rounded-full bg-surface-variant border border-outline-variant flex items-center justify-center text-on-surface hover:bg-outline-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </div>

          {/* Profile Card */}
          <div className="w-full rounded-2xl bg-white border border-outline-variant shadow-sm p-5 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="rounded-full border-2 border-primary/20 overflow-hidden shadow-sm bg-black transition-transform group-hover:scale-105">
                <Avatar size="w-20 h-20" textSize="text-2xl" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <span className="material-symbols-outlined text-white text-[24px]">photo_camera</span>
                </div>
              </div>
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" ref={fileInputRef} onChange={handleAvatarChange} />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-tertiary border-2 border-white flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-white text-[12px]">verified</span>
              </div>
            </div>
            <div className="flex flex-col flex-1 z-10">
              <h3 className="font-headline text-lg text-on-surface font-bold leading-tight">{user.name}</h3>
              <p className="text-xs text-on-surface-variant font-medium">{user.branch} {user.year}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded bg-surface-variant border border-outline-variant font-mono text-[10px] font-bold text-primary">{user.rollNo}</span>
                <span className="px-2 py-0.5 rounded bg-surface-variant border border-outline-variant font-headline text-[10px] font-bold text-on-surface-variant">{user.sem}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Events Attended', value: '12', icon: 'local_activity', color: 'text-primary', bg: 'bg-primary-container' },
              { label: 'Certificates', value: '3', icon: 'workspace_premium', color: 'text-tertiary', bg: 'bg-tertiary-container' },
              { label: 'Campus Rank', value: '#42', icon: 'social_leaderboard', color: 'text-secondary', bg: 'bg-secondary-container' }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white border border-outline-variant shadow-sm">
                <div className={`w-8 h-8 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center mb-1`}>
                  <span className="material-symbols-outlined text-[16px]">{stat.icon}</span>
                </div>
                <span className="font-headline text-lg font-extrabold text-on-surface leading-none">{stat.value}</span>
                <span className="text-[9px] font-headline uppercase tracking-wide text-on-surface-variant font-bold text-center">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Settings */}
          <div className="flex flex-col gap-2 pt-2">
            <h4 className="font-headline text-[11px] uppercase tracking-wider text-on-surface-variant font-bold ml-2 mb-1">Preferences &amp; Settings</h4>
            <div className="w-full rounded-2xl bg-white border border-outline-variant shadow-sm overflow-hidden flex flex-col">

              <div
                className="p-4 flex items-center justify-between border-b border-outline-variant/50 hover:bg-surface-variant transition-colors cursor-pointer"
                onClick={() => setNotifications(!notifications)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">notifications</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-on-surface">Push Notifications</span>
                    <span className="text-[11px] text-on-surface-variant">Event reminders &amp; updates</span>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${notifications ? 'bg-primary' : 'bg-outline-variant'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${notifications ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              <div className="p-4 flex items-center justify-between border-b border-outline-variant/50 hover:bg-surface-variant transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">security</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-on-surface">Security &amp; Privacy</span>
                    <span className="text-[11px] text-on-surface-variant">Password, 2FA, Sessions</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-surface-variant transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">help</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-on-surface">Help &amp; Support</span>
                    <span className="text-[11px] text-on-surface-variant">FAQs &amp; Contact</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </div>

            </div>
          </div>

          {/* Sign Out */}
          <div className="pb-2">
            <button
              onClick={handleLogout}
              className="w-full py-3.5 rounded-xl border-2 border-error/20 text-error font-headline text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Sign Out Securely</span>
            </button>
          </div>

        </div>
      </div>

      {/* Edit Profile Portal Modal */}
      <ProfileSetupModal
        isOpen={editModalOpen}
        initialData={user}
        onComplete={handleSaveProfile}
        onSkip={() => setEditModalOpen(false)}
      />
    </div>
  )
}
