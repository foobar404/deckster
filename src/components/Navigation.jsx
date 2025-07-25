import { useState, useEffect } from 'react'
import styles from './Navigation.module.css'

const Navigation = ({ currentView, onViewChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(280)
  
  // Update CSS custom property when collapse state changes
  useEffect(() => {
    const root = document.documentElement
    if (window.innerWidth >= 768) {
      root.style.setProperty('--nav-width', isCollapsed ? '80px' : '280px')
    } else {
      root.style.setProperty('--nav-width', '0px')
    }
  }, [isCollapsed])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const root = document.documentElement
      if (window.innerWidth >= 768) {
        root.style.setProperty('--nav-width', isCollapsed ? '80px' : '280px')
      } else {
        root.style.setProperty('--nav-width', '0px')
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Call once on mount

    return () => window.removeEventListener('resize', handleResize)
  }, [isCollapsed])

  const handleDragStart = (e) => {
    if (window.innerWidth < 768) return // Only on desktop
    setIsDragging(true)
    setDragStartX(e.clientX)
    setStartWidth(isCollapsed ? 80 : 280)
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }

  const handleDragMove = (e) => {
    if (!isDragging) return
    const deltaX = e.clientX - dragStartX
    const newWidth = Math.max(80, Math.min(400, startWidth + deltaX))
    
    const root = document.documentElement
    root.style.setProperty('--nav-width', `${newWidth}px`)
  }

  const handleDragEnd = (e) => {
    if (!isDragging) return
    setIsDragging(false)
    
    const deltaX = e.clientX - dragStartX
    const newWidth = startWidth + deltaX
    
    // Snap to collapsed or expanded based on threshold
    if (newWidth < 150) {
      setIsCollapsed(true)
    } else {
      setIsCollapsed(false)
    }
    
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
  }
  
  const navItems = [
    { id: 'review', icon: '📚', label: 'Review' },
    { id: 'decks', icon: '📂', label: 'Decks' },
    { id: 'import', icon: '📥', label: 'Import' },
    { id: 'stats', icon: '📊', label: 'Stats' }
  ]

  return (
    <nav className={`${styles.navigation} glass ${isCollapsed ? styles.collapsed : ''}`}>
      <div 
        className={styles.dragHandle}
        onMouseDown={handleDragStart}
        style={{ cursor: isDragging ? 'ew-resize' : 'ew-resize' }}
      >
        <div className={styles.dragIndicator}></div>
      </div>
      
      <div className={styles.navContainer}>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`${styles.navItem} ${currentView === item.id ? styles.active : ''}`}
            onClick={() => onViewChange(item.id)}
            title={isCollapsed ? item.label : ''}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default Navigation
