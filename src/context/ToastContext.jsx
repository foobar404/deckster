import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    const newToast = {
      id,
      message,
      type, // 'info', 'warning', 'error'
      timestamp: Date.now()
    }

    setToasts(prev => [...prev, newToast])

    // Auto remove after 3 seconds
    setTimeout(() => {
      removeToast(id)
    }, 3000)

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showInfo = useCallback((message) => addToast(message, 'info'), [addToast])
  const showWarning = useCallback((message) => addToast(message, 'warning'), [addToast])
  const showError = useCallback((message) => addToast(message, 'error'), [addToast])

  const value = {
    toasts,
    addToast,
    removeToast,
    showInfo,
    showWarning,
    showError
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}
