import { useState, useRef, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ChatWindow from './components/ChatWindow'
import InputArea from './components/InputArea'
import { useChat } from './hooks/useChat'
import './firebase'

const INITIAL_SESSIONS = [
  { id: 1, title: 'Headache & fever symptoms' },
  { id: 2, title: 'Stomach pain after meals' },
  { id: 3, title: 'Recurring chest discomfort' },
  { id: 4, title: 'Skin rash identification' },
  { id: 5, title: 'Joint pain in the morning' },
  { id: 6, title: 'Allergy season symptoms' },
]

export default function App() {
  const [sessions, setSessions] = useState(INITIAL_SESSIONS)
  const [activeSession, setActiveSession] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const inputRef = useRef(null)
  const { messages, isTyping, isAnalyzing, sendMessage, clearMessages } = useChat()

  const handleNewSession = useCallback(() => {
    const newId = Date.now()
    const newSession = { id: newId, title: 'New symptoms session' }
    setSessions(prev => [newSession, ...prev])
    setActiveSession(newId)
    clearMessages()
  }, [clearMessages])

  const handleSelectSession = useCallback((id) => {
    setActiveSession(id)
    clearMessages()
  }, [clearMessages])

  const handleSuggestionSelect = useCallback((prompt) => {
    // Set the input text — we'll use a ref-based approach
    if (inputRef.current) {
      inputRef.current.fillText(prompt)
    }
  }, [])

  const handleActionPill = useCallback((text) => {
    sendMessage(text)
  }, [sendMessage])

  const handleSend = useCallback((text, image) => {
    sendMessage(text, image)

    // Update session title from first message
    if (messages.length === 0 && activeSession) {
      const truncated = text.length > 35 ? text.substring(0, 35) + '...' : text
      setSessions(prev =>
        prev.map(s => s.id === activeSession ? { ...s, title: truncated } : s)
      )
    }

    // Auto-create session if none selected
    if (!activeSession) {
      const newId = Date.now()
      const truncated = text.length > 35 ? text.substring(0, 35) + '...' : text
      setSessions(prev => [{ id: newId, title: truncated }, ...prev])
      setActiveSession(newId)
    }
  }, [sendMessage, messages.length, activeSession])

  return (
    <div className="app-layout">
      <Sidebar
        sessions={sessions}
        activeSession={activeSession}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-panel">
        <TopBar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <ChatWindow
          messages={messages}
          isTyping={isTyping}
          isAnalyzing={isAnalyzing}
          onSuggestionSelect={handleSuggestionSelect}
          onActionPill={handleActionPill}
        />
        <InputArea
          ref={inputRef}
          onSend={handleSend}
          disabled={isTyping}
        />
      </main>


      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay show"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
