import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navigation from './components/Navigation'
import ToastContainer from './components/Toast'
import { ReviewPage, DecksPage, ImportPage, StatsPage } from './pages'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import styles from './App.module.css'

// Component to handle layout and current view detection
const AppLayout = () => {
  const location = useLocation()
  
  // Get current view from location pathname
  const getCurrentView = () => {
    const pathname = location.pathname
    return pathname.replace('/', '') || 'decks'
  }
  
  const currentView = getCurrentView()

  return (
    <div className={styles.app}>
      <main className={`${styles.mainContent} ${currentView === 'review' ? styles.reviewMode : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/decks" replace />} />
          <Route path="/decks" element={<DecksPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/stats" element={<StatsPage />} />
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
          <AppLayout />
        </Router>
      </ToastProvider>
    </AppProvider>
  )
}

export default App
