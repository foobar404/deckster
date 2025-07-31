import { useState, useEffect } from 'react'
import { BiBookReader, BiFolderOpen, BiImport, BiBarChart } from 'react-icons/bi'
import styles from './Navigation.module.css'

const Navigation = ({ currentView, onViewChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  
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
    { id: 'review', icon: BiBookReader, label: 'Review' },
    { id: 'decks', icon: BiFolderOpen, label: 'Decks' },
    { id: 'import', icon: BiImport, label: 'Import' },
    { id: 'stats', icon: BiBarChart, label: 'Stats' }
  ]

  return (
    <nav className={`${styles.navigation} glass ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.navContainer}>
        {navItems.map(item => {
          const IconComponent = item.icon
          return (
            <button
              key={item.id}
              className={`${styles.navItem} ${currentView === item.id ? styles.active : ''}`}
              onClick={() => onViewChange(item.id)}
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
