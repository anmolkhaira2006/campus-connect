import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'
import Toast, { useToast } from './Toast'
import ProfileSetupModal from './ProfileSetupModal'
import AnnouncementModal from './AnnouncementModal'
import { useUser } from '../context/UserContext'
import { apiSaveUserProfile } from '../lib/supabase'

export default function Layout() {
  const { user, isLoggedIn, updateUser } = useUser()
  const showToast = useToast()
  const [skipped, setSkipped] = useState(() => sessionStorage.getItem('skip_profile_prompt') === 'true')

  // Prompt Google users who haven't completed their setup or configured an account password
  const needsSetup = isLoggedIn && (!user?.isProfileSetup || !user?.hasPassword) && !skipped

  const handleCompleteSetup = async (completeData) => {
    updateUser({ ...completeData, isProfileSetup: true, hasPassword: true })
    try {
      await apiSaveUserProfile({ ...user, ...completeData })
    } catch (e) {
      console.warn('Profile save note:', e)
    }
    showToast('Profile and account password secured!')
  }

  const handleSkip = () => {
    setSkipped(true)
    sessionStorage.setItem('skip_profile_prompt', 'true')
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16 lg:pt-20 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
      <MobileBottomNav />
      <Toast />

      {/* Onboarding / Password Setup Modal for Google users */}
      <ProfileSetupModal
        isOpen={needsSetup}
        initialData={user || {}}
        onComplete={handleCompleteSetup}
        onSkip={handleSkip}
      />

      {/* Global Campus Announcement Modal (with 3s/5s mandatory reading timer) */}
      <AnnouncementModal isLoggedIn={isLoggedIn} />
    </div>
  )
}
