import { useEffect, useState } from 'react'

export default function DiagnosisCard({ diagnoses, phase, insight }) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const getLevel = (confidence) => {
    if (confidence >= 0.7) return 'high'
    if (confidence >= 0.5) return 'medium'
    return 'low'
  }

  return (
    <div className={`diagnosis-card ${phase === 'final' ? 'is-final' : ''}`} id="diagnosis-card">
      <div className="diagnosis-title">
        {phase === 'final' ? '✅ Final Diagnosis' : 'Possible Conditions'}
      </div>
      {insight && (
        <div className="diagnosis-insight-top" style={{ 
          marginBottom: '16px', 
          padding: '12px 14px', 
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px',
          borderLeft: '3px solid var(--teal)',
          fontSize: '13px',
          lineHeight: '1.6',
          color: 'rgba(255,255,255,0.85)',
        }}>
          {insight}
        </div>
      )}

      <div className="diagnosis-list">
        {diagnoses.map((d, i) => {
          const level = getLevel(d.confidence)
          const pct = Math.round(d.confidence * 100)
          return (
            <div className="diagnosis-row" key={i}>
              <span className="diagnosis-name">{d.name}</span>
              <div className="diagnosis-bar-track">
                <div
                  className={`diagnosis-bar-fill ${level}`}
                  style={{
                    width: animated ? `${pct}%` : '0%',
                    transitionDelay: `${i * 150}ms`
                  }}
                />
              </div>
              {d.requires_specialist && (
                <span className="specialist-flag" title="Specialist referral strongly recommended">
                  ⚕️ Specialist
                </span>
              )}
              <span className={`diagnosis-pct ${level}`}>
                {pct}%
              </span>

            </div>
          )
        })}
      </div>
    </div>
  )
}
