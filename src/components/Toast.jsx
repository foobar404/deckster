import { useStyle } from '../utils'
import { useEffect, useState, useRef } from 'react'
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

  // Custom styles for Toast
  const customStyles = {
    toast: {
      // mobile: full-width with small side margins, slightly larger padding and rounded corners
      base: 'w-full mx-3 sm:mx-0 sm:w-auto flex items-center gap-3 p-3 sm:p-3 mb-2 rounded-lg shadow-md backdrop-blur-sm transform transition-all duration-150 ease-out max-w-none sm:max-w-sm text-sm',
      info: 'bg-blue-500/95 text-white border border-blue-400/30',
      warning: 'bg-orange-500/95 text-white border border-orange-400/30',
      error: 'bg-red-500/95 text-white border border-red-400/30',
      visible: 'translate-x-0 opacity-100',
      hidden: 'translate-x-full opacity-0',
      leaving: 'translate-x-full opacity-0'
    },
    icon: 'text-lg sm:text-xl flex-shrink-0',
    message: 'flex-1 min-w-0 max-w-[50vw] text-sm font-medium leading-relaxed break-words pr-2 whitespace-pre-wrap',
  }

  const baseStyles = useStyle()

  // Merge base toast styles with local custom styles correctly.
  // baseStyles.toast contains shared toast type classes; customStyles.toast contains layout/state classes.
  const styles = {
    ...baseStyles,
    toast: {
      ...baseStyles.toast,
      ...customStyles.toast,
      icon: customStyles.icon,
      message: customStyles.message,
      closeButton: customStyles.closeButton,
    },
  }

  const getToastStyles = () => {
    // ensure we always pick a valid toast type so background classes are applied
    const typeKey = ['info', 'warning', 'error'].includes(toast.type) ? toast.type : 'info'
    let baseStyles = `${styles.toast.base} ${styles.toast[typeKey]}`

    if (isLeaving) {
      baseStyles += ` ${styles.toast.leaving}`
    } else if (isVisible) {
      baseStyles += ` ${styles.toast.visible}`
    } else {
      baseStyles += ` ${styles.toast.hidden}`
    }

    return baseStyles
  }

  console.log(styles.toast.closeButton)

  return (
    <div className={getToastStyles()}>
      <div className={styles.toast.icon}>
        {getIcon()}
      </div>
      <div className={styles.toast.message}>
        {toast.message}
      </div>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useToast()

  // Custom styles for ToastContainer
  const customStyles = {
    // full-width container on mobile so toasts can span the viewport; on sm+ anchor to right
    // add gap between stacked toasts
    container: 'fixed top-4 z-50 inset-x-0 sm:inset-x-auto sm:right-4 pointer-events-none flex flex-col gap-2 sm:gap-3 items-center sm:items-end',
  }

  const baseStyles2 = useStyle()
  const styles2 = { ...baseStyles2, toastContainer: customStyles }

  if (toasts.length === 0) return null

  return (
    <div className={styles2.toastContainer.container}>
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} />
        </div>
      ))}
    </div>
  )
}


