import { useStyle } from '../utils'
import { Portal } from './Portal'
import { useNavigate, useLocation } from 'react-router-dom'
import { BiBookReader, BiFolderOpen, BiImport, BiCog } from 'react-icons/bi'

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
    { id: 'review', icon: BiBookReader, label: 'Study', path: '/review' },
    { id: 'import', icon: BiImport, label: 'Import', path: '/import' },
    { id: 'settings', icon: BiCog, label: 'Settings', path: '/settings' }
  ]

  const handleNavigation = (path) => {
    navigate(path, {
      replace: location.pathname === path,
      state: { navRoot: Date.now() }
    })
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
    navigation: 'fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-3 right-3 z-50 rounded-2xl border border-white/90 bg-white/85 p-1.5 shadow-[0_12px_36px_rgba(15,23,42,0.18)] backdrop-blur-2xl md:left-1/2 md:right-auto md:w-full md:max-w-md md:-translate-x-1/2',
    container: 'grid grid-cols-4 items-center gap-1',
    item: {
      base: 'group flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-slate-500 transition-colors duration-200 touch-manipulation hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
      active: 'group flex min-w-0 flex-col items-center justify-center rounded-xl px-0 py-0.5 text-teal-900 transition-colors duration-200 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500'
    },
    tabContent: 'flex w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1',
    activeTabContent: 'border-2 border-[var(--theme-primary)] bg-teal-100 text-teal-900 shadow-sm',
    iconWrap: 'flex h-8 w-10 items-center justify-center rounded-lg',
    icon: 'text-[1.35rem]',
    label: {
      base: 'truncate text-[11px] font-semibold leading-tight text-slate-500',
      active: 'truncate text-[11px] font-bold leading-tight text-teal-900'
    }
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
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={`${styles.navigation.tabContent} ${isActive ? styles.navigation.activeTabContent : ''}`}>
                  <span className={styles.navigation.iconWrap}>
                    <IconComponent className={styles.navigation.icon} />
                  </span>
                  <span className={isActive ? styles.navigation.label.active : styles.navigation.label.base}>{item.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </Portal>
  )
}


