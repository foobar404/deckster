import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function Portal({ children, containerId = 'modal-root' }) {
  const [container, setContainer] = useState(null)

  useEffect(() => {
    // Try to find existing container
    let containerElement = document.getElementById(containerId)

    // Create container if it doesn't exist
    if (!containerElement) {
      containerElement = document.createElement('div')
      containerElement.id = containerId
      containerElement.style.position = 'relative'
      containerElement.style.zIndex = '9999'
      document.body.appendChild(containerElement)
    }

    setContainer(containerElement)

    // Cleanup function to remove container when component unmounts
    return () => {
      if (containerElement && containerElement.childNodes.length === 0) {
        document.body.removeChild(containerElement)
      }
    }
  }, [containerId])

  // Don't render anything until container is ready
  if (!container) return null

  // Use createPortal to render children into the container
  return createPortal(children, container)
}


