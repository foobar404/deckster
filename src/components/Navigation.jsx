import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BiBookReader, BiFolderOpen, BiImport, BiBarChart } from 'react-icons/bi'
import styles from './Navigation.module.css'

const Navigation = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get current view from location pathname (since we're using HashRouter)
  const getCurrentView = () => {
    const pathname = location.pathname
    return pathname.replace('/', '') || 'decks' // Default to decks since that's the main page
  }
  
  const currentView = getCurrentView()
  
  // Update CSS custom property when collapse state changes
  useEffect(() => {
    const root = document.documentElement
    if (window.innerWidth >= 768) {
      root.style.setProperty('--nav-width', isCollapsed ? '72px' : '240px')
    } else {
      root.style.setProperty('--nav-width', '0px')
    }
  }, [isCollapsed])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const root = document.documentElement
      if (window.innerWidth >= 768) {
        root.style.setProperty('--nav-width', isCollapsed ? '72px' : '240px')
      } else {
        root.style.setProperty('--nav-width', '0px')
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Call once on mount

    return () => window.removeEventListener('resize', handleResize)
  }, [isCollapsed])
  
  const navItems = [
    { id: 'decks', icon: BiFolderOpen, label: 'Decks', path: '/decks' },
    { id: 'review', icon: BiBookReader, label: 'Review', path: '/review' },
    { id: 'import', icon: BiImport, label: 'Import', path: '/import' },
    { id: 'stats', icon: BiBarChart, label: 'Stats', path: '/stats' }
  ]

  const handleNavigation = (path) => {
    navigate(path)
  }

  return (
    <nav className={`${styles.navigation} glass ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.navContainer}>
        {navItems.map(item => {
          const IconComponent = item.icon
          return (
            <button
              key={item.id}
              className={`${styles.navItem} ${currentView === item.id ? styles.active : ''}`}
              onClick={() => handleNavigation(item.path)}
              title={isCollapsed ? item.label : ''}
            >
              <IconComponent className={styles.navIcon} />
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default Navigation
