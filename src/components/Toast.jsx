import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '../context/ToastContext'
import { FaInfoCircle, FaExclamationTriangle, FaExclamationCircle, FaTimes } from 'react-icons/fa'

/**
 * Custom hook for Toast logic and state management
 * @param {Object} toast - Toast object with id, message, type
 * @returns {Object} All state and handlers needed by the Toast component
 */
const useToastItem = (toast) => {
  const { removeToast } = useToast()
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const exitTimerRef = useRef(null)

  useEffect(() => {
    // Trigger enter animation
    setTimeout(() => setIsVisible(true), 10)

    // Start exit animation before removal for automatic timeout
    exitTimerRef.current = setTimeout(() => {
      setIsLeaving(true)
      exitTimerRef.current = setTimeout(() => removeToast(toast.id), 200)
    }, 2800)

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    }
  }, [toast.id, removeToast])

  const handleClose = () => {
    // When user manually closes, remove immediately without running the exit animation.
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }
    removeToast(toast.id)
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'error':
        return <FaExclamationCircle />
      case 'warning':
        return <FaExclamationTriangle />
      case 'info':
      default:
        return <FaInfoCircle />
    }
  }

  return {
    isVisible,
    isLeaving,
    handleClose,
    getIcon
  }
}

function Toast({ toast }) {
  const { isVisible, isLeaving, handleClose, getIcon } = useToastItem(toast)

  const getToastClassName = () => {
    const typeKey = ['info', 'warning', 'error'].includes(toast.type) ? toast.type : 'info'
    const visibility = isLeaving ? 'is-leaving' : isVisible ? 'is-visible' : 'is-entering'
    return `toast toast--${typeKey} ${visibility}`
  }

  return (
    <div className={getToastClassName()}>
      <div className="toast__icon">
        {getIcon()}
      </div>
      <div className="toast__message">
        {toast.message}
      </div>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return createPortal(
    <div className="toast-region">
      {toasts.map(toast => (
        <div key={toast.id} className="toast-region__item">
          <Toast toast={toast} />
        </div>
      ))}
    </div>,
    document.body
  )
}
