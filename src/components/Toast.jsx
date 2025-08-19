import { useEffect, useState } from 'react'
import { FaInfoCircle, FaExclamationTriangle, FaExclamationCircle, FaTimes } from 'react-icons/fa'
import { useToast } from '../context/ToastContext'
import styles from './Toast.module.css'

const Toast = ({ toast }) => {
  const { removeToast } = useToast()
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    setTimeout(() => setIsVisible(true), 10)
    
    // Start exit animation before removal
    const exitTimer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => removeToast(toast.id), 200)
    }, 2800)
    
    return () => clearTimeout(exitTimer)
  }, [toast.id, removeToast])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => removeToast(toast.id), 200)
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

  return (
    <div 
      className={`${styles.toast} ${styles[toast.type]} ${isVisible ? styles.visible : ''} ${isLeaving ? styles.leaving : ''}`}
    >
      <div className={styles.icon}>
        {getIcon()}
      </div>
      <div className={styles.message}>
        {toast.message}
      </div>
      <button 
        className={styles.closeButton}
        onClick={handleClose}
        aria-label="Close notification"
      >
        <FaTimes />
      </button>
    </div>
  )
}

const ToastContainer = () => {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className={styles.container}>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

export default ToastContainer
