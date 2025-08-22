import { useStyle } from '../utils'
import { useState, useEffect } from 'react'
import { Portal } from './Portal'
import { useNavigate, useLocation } from 'react-router-dom'
import { BiBookReader, BiFolderOpen, BiImport, BiBarChart } from 'react-icons/bi'

/**
 * Custom hook for Navigation logic and state management
 * @returns {Object} All state and handlers needed by the Navigation component
 */
const useNavigation = () => {
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

  return {
    isCollapsed,
    currentView,
    navItems,
    handleNavigation
  }
}

export function Navigation() {
  const { isCollapsed, currentView, navItems, handleNavigation } = useNavigation()

  // Custom styles for Navigation
  const customStyles = {
    navigation: {
      // rounded top corners on mobile; on md+ keep nav fixed to the left so it remains visible while scrolling
      base: 'fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-200 rounded-t-3xl md:rounded-none shadow-lg md:fixed md:top-0 md:bottom-0 md:left-0 md:border-t-0 md:border-r md:shadow-none md:h-screen md:w-20 md:bg-white/95',
      collapsed: 'md:w-20'
    },
    container: 'flex items-center justify-around py-2 px-4 md:flex-col md:items-center md:justify-start md:py-6 md:px-2 md:gap-6',
    item: {
      base: 'flex flex-col items-center justify-center py-2 px-3 text-gray-600 hover:text-blue-600 transition-all duration-200 touch-manipulation rounded-lg hover:bg-blue-50 min-w-0 flex-1 md:flex-none md:w-12 md:h-12',
      active: 'flex flex-col items-center justify-center py-2 px-3 text-blue-600 bg-blue-50 rounded-lg min-w-0 flex-1 md:flex-none md:w-12 md:h-12'
    },
    icon: 'text-xl mb-1 md:mb-0',
    label: 'text-xs font-medium leading-tight md:hidden'
  }

  const baseStyles = useStyle()
  const styles = { ...baseStyles, navigation: customStyles }

  return (
    <Portal containerId="nav-root">
      <nav className={`${customStyles.navigation.base} ${isCollapsed ? styles.navigation.collapsed : ''}`}>
        <div className={styles.navigation.container}>
          {navItems.map(item => {
            const IconComponent = item.icon
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                className={isActive ? styles.navigation.item.active : styles.navigation.item.base}
                onClick={() => handleNavigation(item.path)}
                title={isCollapsed ? item.label : ''}
              >
                <IconComponent className={styles.navigation.icon} />
                <span className={styles.navigation.label}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </Portal>
  )
}


