export default function Sidebar({ sessions, activeSession, onSelectSession, onNewSession, sidebarOpen, onClose }) {
  const recentSessions = sessions.slice(0, 4)
  const olderSessions = sessions.slice(4)

  const handleSelect = (id) => {
    onSelectSession(id)
    onClose()
  }

  const handleNew = () => {
    onNewSession()
    onClose()
  }

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        {/* Logo */}
        <div className="sidebar-logo sidebar-fade-item" style={{ animationDelay: '0ms' }}>
          <span className="sidebar-logo-icon">🩺</span>
          <span className="sidebar-logo-text">MediAI</span>
          <span className="sidebar-beta">Beta</span>
        </div>

        {/* New Session */}
        <button
          className="sidebar-new-btn sidebar-fade-item"
          style={{ animationDelay: '80ms' }}
          onClick={handleNew}
          id="new-session-btn"
        >
          <span style={{ fontSize: '16px' }}>+</span>
          New Session
        </button>

        {/* Sessions List */}
        <div className="sidebar-sessions">
          {recentSessions.length > 0 && (
            <div className="sidebar-section-label sidebar-fade-item" style={{ animationDelay: '160ms' }}>
              Recent
            </div>
          )}
          {recentSessions.map((session, i) => (
            <div
              key={session.id}
              className={`sidebar-session-item sidebar-fade-item ${activeSession === session.id ? 'active' : ''}`}
              style={{ animationDelay: `${240 + i * 80}ms` }}
              onClick={() => handleSelect(session.id)}
              id={`session-${session.id}`}
            >
              <span className="sidebar-session-icon">💬</span>
              <span className="sidebar-session-text">{session.title}</span>
            </div>
          ))}

          {olderSessions.length > 0 && (
            <>
              <div className="sidebar-section-label sidebar-fade-item" style={{ animationDelay: `${240 + recentSessions.length * 80}ms` }}>
                Older
              </div>
              {olderSessions.map((session, i) => (
                <div
                  key={session.id}
                  className={`sidebar-session-item sidebar-fade-item ${activeSession === session.id ? 'active' : ''}`}
                  style={{ animationDelay: `${320 + (recentSessions.length + i) * 80}ms` }}
                  onClick={() => handleSelect(session.id)}
                  id={`session-${session.id}`}
                >
                  <span className="sidebar-session-icon">💬</span>
                  <span className="sidebar-session-text">{session.title}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* User */}
        <div className="sidebar-user sidebar-fade-item" style={{ animationDelay: '800ms' }}>
          <div className="sidebar-avatar">AK</div>
          <div>
            <div className="sidebar-user-name">Alex Kumar</div>
            <div className="sidebar-user-status">Free Plan</div>
          </div>
        </div>
      </aside>
    </>
  )
}
