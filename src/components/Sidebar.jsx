import { useState, useEffect, useRef } from 'react'

export default function Sidebar({ sessions, activeSession, onSelectSession, onNewSession, sidebarOpen, onClose, user, onUpdateUser }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tempName, setTempName] = useState(user?.name || 'Alex Kumar')
  const menuRef = useRef(null)

  const recentSessions = sessions.slice(0, 4)
  const olderSessions = sessions.slice(4)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (id) => {
    onSelectSession(id)
    onClose()
  }

  const handleNew = () => {
    onNewSession()
    onClose()
  }

  const handleUpdateName = (e) => {
    e.preventDefault()
    onUpdateUser({ name: tempName })
    setIsModalOpen(false)
    setMenuOpen(false)
  }

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : 'AK'

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        {/* Logo */}
        <div className="sidebar-logo sidebar-fade-item" style={{ animationDelay: '0ms' }}>
          <span className="sidebar-logo-icon">🩺</span>
          <span className="sidebar-logo-text">InferaDx</span>
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
        <div 
          className={`sidebar-user sidebar-fade-item ${menuOpen ? 'active' : ''}`} 
          style={{ animationDelay: '800ms' }}
          onClick={() => setMenuOpen(!menuOpen)}
          ref={menuRef}
        >
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">{userInitials}</div>
            <div>
              <div className="sidebar-user-name">{user?.name || 'Alex Kumar'}</div>
              <div className="sidebar-user-status">{user?.plan || 'Free Plan'}</div>
            </div>
          </div>
          <span className="sidebar-user-chevron">▼</span>

          {menuOpen && (
            <div className="user-menu" onClick={(e) => e.stopPropagation()}>
              <div className="user-menu-header sidebar-user-info" style={{ cursor: 'default', background: 'rgba(255,255,255,0.03)', marginBottom: '4px' }}>
                <div className="sidebar-avatar" style={{ width: '30px', height: '30px', fontSize: '11px' }}>{userInitials}</div>
                <div>
                  <div className="sidebar-user-name" style={{ fontSize: '12px' }}>{user?.name}</div>
                  <div className="sidebar-user-status" style={{ fontSize: '10px' }}>{user?.plan}</div>
                </div>
              </div>

              <div className="user-menu-item">
                <span className="user-menu-icon">✨</span>
                Upgrade plan
              </div>
              <div className="user-menu-item">
                <span className="user-menu-icon">🎨</span>
                Personalization
              </div>
              <div className="user-menu-item" onClick={() => { setTempName(user?.name || ''); setIsModalOpen(true); setMenuOpen(false); }}>
                <span className="user-menu-icon">👤</span>
                Profile
              </div>
              <div className="user-menu-item">
                <span className="user-menu-icon">⚙️</span>
                Settings
              </div>
              
              <div className="user-menu-divider"></div>
              
              <div className="user-menu-item">
                <span className="user-menu-icon">❓</span>
                Help
              </div>
              <div className="user-menu-item danger">
                <span className="user-menu-icon">↪️</span>
                Log out
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Profile Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Profile</h2>
            </div>
            <form onSubmit={handleUpdateName}>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={tempName} 
                  onChange={(e) => setTempName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
