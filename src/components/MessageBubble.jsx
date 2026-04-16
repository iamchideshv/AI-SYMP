import { useState } from 'react'
import DiagnosisCard from './DiagnosisCard'

export default function MessageBubble({ message, onAction }) {
  const [showRemedyOptions, setShowRemedyOptions] = useState(false)
  const isUser = message.role === 'user'
  const isError = !isUser && (
    message.content?.startsWith('Error:') ||
    message.content?.includes('quota exceeded') ||
    message.content?.includes('Could not connect')
  )

  const isQuotaError = !isUser && (
    message.content?.includes('quota exceeded') ||
    message.content?.includes('rate-limit') ||
    message.content?.includes('Quota exceeded')
  )

  return (
    <div className={`message-row ${isUser ? 'user' : 'ai'}`}>
      {isUser ? (
        <div className="message-avatar user-avatar">AK</div>
      ) : (
        <div className="message-avatar ai-avatar">🩺</div>
      )}

      <div style={{ maxWidth: '75%' }}>
        {isError ? (
          <div className="error-bubble">
            <div className="error-bubble-header">
              <span className="error-icon">⚠️</span>
              <span>{isQuotaError ? 'API Quota Exceeded' : 'Connection Error'}</span>
            </div>
            <p className="error-bubble-body">{message.content.replace(/^Error:\s*/, '')}</p>
            {isQuotaError && (
              <a
                className="error-bubble-link"
                href="https://ai.dev/rate-limit"
                target="_blank"
                rel="noopener noreferrer"
              >
                View quota &amp; billing →
              </a>
            )}
          </div>
        ) : (
          <>
            <div className={`message-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
              {message.imageUrl && (
                <div className="message-image-container">
                  <img src={message.imageUrl} alt="Attached symptom" className="message-image" />
                </div>
              )}
              
              {/* Show explanation text only if it's the user OR a final AI diagnosis WITHOUT a separate insight */}
              {(isUser || (message.phase === 'final' && !message.insight)) && message.content && <p>{message.content}</p>}
              
              {!isUser && message.diagnoses && message.diagnoses.length > 0 && (
                <DiagnosisCard diagnoses={message.diagnoses} phase={message.phase} insight={message.insight} />
              )}
            </div>

            {/* Dedicated Question Box for active refinement phases or when a specific question is provided */}
            {!isUser && (message.question || (message.content && !message.insight && message.phase !== 'final')) && (
              <div className="question-box">
                <div className="question-header">
                  <span className="question-icon">🔍</span>
                  <span className="question-label">Follow-up Question</span>
                </div>
                <p className="question-text">{message.question || message.content}</p>
              </div>
            )}


            {!isUser && (
              <div className="message-actions">
                {showRemedyOptions ? (
                  <>
                    <div className="action-label" style={{ width: '100%', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Select a condition for home remedies:
                    </div>
                    {message.diagnoses?.map((d, i) => (
                      <button
                        key={i}
                        className="action-pill remedy-option"
                        onClick={() => {
                          onAction && onAction(`What are some safe home remedies for ${d.name}?`)
                          setShowRemedyOptions(false)
                        }}
                      >
                        {d.name}
                      </button>
                    ))}
                    <button
                      className="action-pill back-pill"
                      onClick={() => setShowRemedyOptions(false)}
                      style={{ opacity: 0.7 }}
                    >
                      ← Back
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="action-pill"
                      onClick={() => onAction && onAction('Can you ask me more questions to narrow down the diagnosis?')}
                    >
                      Ask more questions
                    </button>
                    <button
                      className="action-pill"
                      onClick={() => {
                        if (message.diagnoses && message.diagnoses.length > 0) {
                          setShowRemedyOptions(true)
                        } else {
                          onAction && onAction('What are some safe home remedies for my symptoms?')
                        }
                      }}
                    >
                      🏠 Home Remedies
                    </button>
                    <button
                      className="action-pill"
                      onClick={() => onAction && onAction('What are the recommended clinical solutions or treatment paths?')}
                    >
                      🔬 Solutions
                    </button>
                    <button
                      className="action-pill"
                      onClick={() => onAction && onAction('Find nearby doctors for this condition')}
                    >
                      🩺 Find doctors
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
