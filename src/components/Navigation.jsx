import { useStyle } from '../utils'
import { Portal } from './Portal'
import { useNavigate, useLocation } from 'react-router-dom'
import { BiBookReader, BiFolderOpen, BiImport, BiBarChart } from 'react-icons/bi'

/**
 * Custom hook for Navigation logic and state management
 * @returns {Object} All state and handlers needed by the Navigation component
 */
const useNavigation = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Get current view from location pathname (since we're using HashRouter)
  const getCurrentView = () => {
    const pathname = location.pathname
    return pathname.replace('/', '') || 'decks' // Default to decks since that's the main page
  }

  const currentView = getCurrentView()

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
    currentView,
    navItems,
    handleNavigation
  }
}

export function Navigation() {
  const { currentView, navItems, handleNavigation } = useNavigation()

  // Custom styles for Navigation
  const customStyles = {
    // Bottom bar on mobile; fixed top bar spanning full width on desktop
    navigation: 'fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-200 rounded-t-3xl shadow-lg md:top-0 md:bottom-auto md:left-0 md:right-0 md:rounded-none md:border-t-0 md:border-b md:shadow-sm md:h-16 md:bg-white/95',
    container: 'flex items-center justify-around py-2 px-4 md:h-full md:max-w-5xl md:mx-auto md:justify-start md:gap-2 md:px-6 md:py-0',
    item: {
      base: 'flex flex-col items-center justify-center py-2 px-3 text-gray-600 hover:text-blue-600 transition-all duration-200 touch-manipulation rounded-lg hover:bg-blue-50 min-w-0 flex-1 md:flex-row md:flex-none md:gap-2 md:px-4 md:py-2 md:h-11',
      active: 'flex flex-col items-center justify-center py-2 px-3 text-blue-600 bg-blue-50 rounded-lg min-w-0 flex-1 md:flex-row md:flex-none md:gap-2 md:px-4 md:py-2 md:h-11'
    },
    icon: 'text-xl mb-1 md:mb-0 md:text-lg',
    label: 'text-xs font-medium leading-tight md:hidden lg:inline lg:text-sm'
  }

  const baseStyles = useStyle()
  const styles = { ...baseStyles, navigation: customStyles }

  return (
    <Portal containerId="nav-root">
      <nav className={styles.navigation.navigation}>
        <div className={styles.navigation.container}>
          {navItems.map(item => {
            const IconComponent = item.icon
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                className={isActive ? styles.navigation.item.active : styles.navigation.item.base}
                onClick={() => handleNavigation(item.path)}
                title={item.label}
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


