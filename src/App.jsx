import './css/themes.css'
import './css/index.css'
import './css/shared.css'
import { StrictMode } from 'react'
import { useContext } from 'react'
import { createRoot } from 'react-dom/client'
import { AppContext, AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import { Navigation } from './components/Navigation'
import { ToastContainer } from './components/Toast'
import { StudyPage, DecksPage, ImportPage, SettingsPage } from './pages'
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'

/**
 * Custom hook for App layout logic and state management
 * @returns {Object} All state and handlers needed by the App component
 */
const useApp = () => {
  const { pathname } = useLocation()
  const { activeDeck } = useContext(AppContext)
  const isStudyPage = pathname === '/study' || pathname === '/review'
  const isStudyDeckSelection = isStudyPage && (!activeDeck || !activeDeck.cards?.length)

  return {
    isStudyPage,
    isStudyDeckSelection
  }
}

function AppContent() {
  const { isStudyPage, isStudyDeckSelection } = useApp()

  return (
    <div className="app-shell">
      <main
        className={`app-main${isStudyPage ? ' app-main--study' : ''}`}
        style={isStudyPage ? {
          flex: '0 0 calc(100dvh - var(--mobile-nav-clearance))',
          height: 'calc(100dvh - var(--mobile-nav-clearance))',
          minHeight: 0,
          paddingBottom: 0,
          overflowY: isStudyDeckSelection ? 'auto' : 'visible'
        } : undefined}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/decks" replace />} />
          <Route path="/decks" element={<DecksPage />} />
          <Route path="/study" element={<StudyPage />} />
          <Route path="/review" element={<Navigate to="/study" replace />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/stats" element={<Navigate to="/decks" replace />} />
        </Routes>
      </main>
      <Navigation />
      <ToastContainer />
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </AppProvider>
  )
}

// Initialize and render the app
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
