import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { UserProvider } from './context/UserContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AnalyticsTracker from './components/AnalyticsTracker'
import './index.css'

const EventsDiscovery = lazy(() => import('./pages/EventsDiscovery'))
const MyPasses = lazy(() => import('./pages/MyPasses'))
const CertificatesVault = lazy(() => import('./pages/CertificatesVault'))
const Profile = lazy(() => import('./pages/Profile'))
const HostConsole = lazy(() => import('./pages/HostConsole'))
const Home = lazy(() => import('./pages/Home'))
const Contact = lazy(() => import('./pages/Contact'))
const CcAdmin = lazy(() => import('./pages/CcAdmin'))

const PageLoader = () => (
  <div className="w-full h-screen flex items-center justify-center bg-[#09090f]">
    <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <AnalyticsTracker />
      <UserProvider>
        <ToastProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/auth" element={<Navigate to="/" replace />} />
              <Route element={<Layout />}>
                <Route path="cc-a-d-m-i-n" element={<CcAdmin />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="events" element={<EventsDiscovery />} />
                  <Route path="passes" element={<MyPasses />} />
                  <Route path="certificates" element={<CertificatesVault />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="host" element={<HostConsole />} />
                  <Route path="contact" element={<Contact />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </UserProvider>
    </BrowserRouter>
  )
}
