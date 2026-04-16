import DiagnosisCard from './DiagnosisCard'

export default function MessageBubble({ message, onAction }) {
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
              {message.content && <p>{message.content}</p>}
              {!isUser && message.diagnoses && message.diagnoses.length > 0 && (
                <DiagnosisCard diagnoses={message.diagnoses} />
              )}
            </div>


            {!isUser && (
              <div className="message-actions">
                <button
                  className="action-pill"
                  onClick={() => onAction && onAction('Can you ask me more questions to narrow down the diagnosis?')}
                >
                  Ask more questions
                </button>
                <button
                  className="action-pill"
                  onClick={() => onAction && onAction('What are some safe home remedies for this?')}
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
