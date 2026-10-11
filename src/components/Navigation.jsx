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
    { id: 'study', icon: BiBookReader, label: 'Study', path: '/study' },
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

  return (
    <Portal containerId="nav-root">
      <nav className="app-navigation" aria-label="Main navigation">
        <div className="app-navigation__grid">
          {navItems.map(item => {
            const IconComponent = item.icon
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                className={`app-navigation__button${isActive ? ' is-active' : ''}`}
                onClick={() => handleNavigation(item.path)}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="app-navigation__tab">
                  <span className="app-navigation__icon-wrap">
                    <IconComponent className="app-navigation__icon" aria-hidden="true" />
                  </span>
                  <span className="app-navigation__label">{item.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </Portal>
  )
}
