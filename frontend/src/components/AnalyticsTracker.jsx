import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import ReactGA from 'react-ga4'

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID.startsWith('G-')) {
  ReactGA.initialize(GA_MEASUREMENT_ID)
}

export default function AnalyticsTracker() {
  const location = useLocation()

  useEffect(() => {
    if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID.startsWith('G-')) {
      ReactGA.send({
        hitType: 'pageview',
        page: location.pathname + location.search,
        title: document.title,
      })
    }
  }, [location])

  return null
}

export const trackCustomEvent = (category, action, label = '', value = 0) => {
  if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID.startsWith('G-')) {
    ReactGA.event({
      category,
      action,
      label,
      value,
    })
  }
}
