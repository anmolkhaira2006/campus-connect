import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useEffect } from 'react'
import { useToast } from './Toast'

export default function ProtectedRoute() {
  const { isLoggedIn } = useUser()
  const showToast = useToast()
  const location = useLocation()

  useEffect(() => {
    if (!isLoggedIn) {
      showToast('Access restricted: Please log in or create an account to continue.')
    }
  }, [isLoggedIn, location.pathname])

  if (!isLoggedIn) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
