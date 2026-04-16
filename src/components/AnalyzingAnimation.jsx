export default function AnalyzingAnimation() {
  return (
    <div className="analyzing-container">
      <div className="analyzing-bubble">
        <div className="scanner-line"></div>
        <div className="analyzing-content">
          <span className="analyzing-icon">🔍</span>
          <span className="analyzing-text">Analyzing image data...</span>
        </div>
        <div className="scanning-dots">
          <div className="scan-dot"></div>
          <div className="scan-dot"></div>
          <div className="scan-dot"></div>
        </div>
      </div>
    </div>
  )
}
