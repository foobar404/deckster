import './Navigation.css'

const Navigation = ({ currentView, onViewChange }) => {
  const navItems = [
    { id: 'review', icon: '📚', label: 'Review' },
    { id: 'decks', icon: '📂', label: 'Decks' },
    { id: 'import', icon: '📥', label: 'Import' },
    { id: 'stats', icon: '📊', label: 'Stats' }
  ]

  return (
    <nav className="navigation glass">
      <div className="nav-container">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default Navigation
