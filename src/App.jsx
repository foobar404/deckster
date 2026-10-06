import './css/index.css'
import { useStyle } from './utils'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import { Navigation } from './components/Navigation'
import { ToastContainer } from './components/Toast'
import { ReviewPage, DecksPage, ImportPage, SettingsPage } from './pages'
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'

/**
 * Custom hook for App layout logic and state management
 * @returns {Object} All state and handlers needed by the App component
 */
const useApp = () => {
  const { pathname } = useLocation()
  const isReviewMode = pathname === '/review'

  return {
    isReviewMode
  }
}

function AppContent() {
  const { isReviewMode } = useApp()

  // Custom styles for App layout
  const customStyles = {
    app: 'flex flex-col h-screen h-dvh w-full relative overflow-hidden bg-gradient-to-br backdrop-blur-sm from-slate-50 via-blue-50/80 to-purple-50/70 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_20%_80%,rgba(120,180,255,0.15)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(255,120,180,0.12)_0%,transparent_50%),radial-gradient(circle_at_40%_40%,rgba(180,255,120,0.08)_0%,transparent_50%)] after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.03)_1px,transparent_0),radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.02)_1px,transparent_0)] after:bg-[length:20px_20px,25px_25px] after:bg-[position:0_0,10px_10px] after:opacity-60 after:pointer-events-none',
    mainContent: `h-screen z-10 flex-1 pb-[var(--mobile-nav-clearance)] overflow-y-auto overflow-x-hidden relative z-10 w-full max-w-full min-h-0 md:min-h-screen md:h-auto md:overflow-y-auto ${isReviewMode ? 'sm:p-0 sm:pb-[var(--mobile-nav-clearance)] md:pb-[var(--mobile-nav-clearance)] sm:bg-transparent sm:border-0' : 'md:px-8'}`,
    backgroundOverlay: 'absolute inset-0 bg-gradient-to-t from-white/25 to-white/5 backdrop-blur-sm pointer-events-none'
  }

  const baseStyles = useStyle()
  const styles = { ...baseStyles, app: customStyles }

  return (
    <div className={styles.app.app}>
      <main
        className={styles.app.mainContent}
        style={isReviewMode ? {
          flex: '0 0 calc(100dvh - var(--mobile-nav-clearance))',
          height: 'calc(100dvh - var(--mobile-nav-clearance))',
          minHeight: 0,
          paddingBottom: 0,
          overflow: 'visible'
        } : undefined}
      >
        {/* <div className={styles.app.backgroundOverlay}></div> */}
        <Routes>
          <Route path="/" element={<Navigate to="/decks" replace />} />
          <Route path="/decks" element={<DecksPage />} />
          <Route path="/review" element={<ReviewPage />} />
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
