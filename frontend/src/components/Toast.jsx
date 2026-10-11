import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2800)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
          <div className={`px-5 py-3 rounded-full shadow-xl flex items-center gap-2.5 text-sm font-medium ${
            toast.type === 'success' ? 'bg-on-surface text-white' : 'bg-error text-white'
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export default function Toast() {
  return null
}
