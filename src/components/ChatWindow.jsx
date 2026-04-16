import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import AnalyzingAnimation from './AnalyzingAnimation'
import SuggestionCards from './SuggestionCards'

export default function ChatWindow({ messages, isTyping, isAnalyzing, onSuggestionSelect, onActionPill }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, isAnalyzing])

  const hasMessages = messages.length > 0

  return (
    <div className="chat-area" id="chat-area">
      {!hasMessages ? (
        <div className="welcome">
          <div className="welcome-icon">🩺</div>
          <h1 className="welcome-heading">What symptoms are you experiencing?</h1>
          <p className="welcome-subtitle">
            Describe what you're feeling and MediAI will analyze your symptoms
            to suggest possible conditions. Get instant insights powered by
            advanced medical AI.
          </p>
          <SuggestionCards onSelect={onSuggestionSelect} />
        </div>
      ) : (
        <div className="messages-list">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onAction={onActionPill}
            />
          ))}
          {isAnalyzing && <AnalyzingAnimation />}
          {isTyping && !isAnalyzing && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

