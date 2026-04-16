import { useEffect, useState } from 'react'

export default function DiagnosisCard({ diagnoses }) {
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
    <div className="diagnosis-card" id="diagnosis-card">
      <div className="diagnosis-title">Possible Conditions</div>
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
