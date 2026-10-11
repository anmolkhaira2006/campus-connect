import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'
import Toast from './Toast'

export default function Layout() {
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
    </div>
  )
}
