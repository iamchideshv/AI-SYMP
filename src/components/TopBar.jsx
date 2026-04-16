export default function TopBar({ onToggleSidebar }) {
  return (
    <div className="topbar" id="topbar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          className="hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          id="topbar-hamburger"
        >
          ☰
        </button>
        <div className="topbar-model">
          <span className="topbar-pulse" />
          <span>MediLLM v1 · Symptoms Mode</span>
        </div>
      </div>

      <div className="topbar-actions">
        <button className="topbar-action-btn" id="share-btn" title="Share">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
        <button className="topbar-action-btn" id="more-btn" title="More options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
