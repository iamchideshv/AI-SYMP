import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

const InputArea = forwardRef(function InputArea({ onSend, disabled }, ref) {
  const [text, setText] = useState('')
  const [activeMode, setActiveMode] = useState('symptom')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const menuRef = useRef(null)
  const photoBtnRef = useRef(null) // New ref for the button

  const modes = [
    { id: 'symptom', icon: '🔬', label: 'Symptom Mode' },
    { id: 'medication', icon: '💊', label: 'Medication' },
    { id: 'history', icon: '📋', label: 'History' },
    { id: 'nearby', icon: '🏥', label: 'Nearby' },
  ]

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && 
          !menuRef.current.contains(event.target) && 
          !photoBtnRef.current?.contains(event.target)) {
        setShowPhotoMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])


  // Expose fillText method to parent via ref
  useImperativeHandle(ref, () => ({
    fillText: (value) => {
      setText(value)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }))

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = '24px'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    }
  }, [text])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
    setShowPhotoMenu(false)
  }

  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment')
      fileInputRef.current.click()
    }
  }

  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture')
      fileInputRef.current.click()
    }
  }

  const handleSend = () => {
    if ((!text.trim() && !selectedImage) || disabled) return
    onSend(text, selectedImage)
    setText('')
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="input-area" id="input-area">
      {showPhotoMenu && (
        <div className="capture-menu" ref={menuRef}>
          <button className="capture-option" onClick={triggerCamera}>
            <span className="capture-option-icon">📷</span>
            Take Point Photo (Camera)
          </button>
          <button className="capture-option" onClick={triggerUpload}>
            <span className="capture-option-icon">🖼️</span>
            Upload from Gallery
          </button>
        </div>
      )}
      <div className="input-container" style={{ position: 'relative' }}>

        <div className="input-modes">
          {modes.map(m => (
            <button
              key={m.id}
              className={`mode-pill ${activeMode === m.id ? 'active' : ''}`}
              onClick={() => setActiveMode(m.id)}
              id={`mode-${m.id}`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {imagePreview && (
          <div className="image-preview-bar">
            <div className="preview-thumbnail-container">
              <img src={imagePreview} alt="Preview" className="preview-thumbnail" />
              <button className="remove-image-btn" onClick={removeImage}>✕</button>
            </div>
            <div className="preview-info">
              <span className="preview-name">{selectedImage?.name}</span>
              <span className="preview-status">Ready for Analysis</span>
            </div>
          </div>
        )}

        <div className="input-row">
          <button 
            ref={photoBtnRef}
            className="photo-btn" 
            onClick={() => setShowPhotoMenu(!showPhotoMenu)}
            aria-label="Add photo"
          >

            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            className="input-textarea"
            placeholder={selectedImage ? "Add details about this image..." : "Describe your symptoms..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            id="symptom-input"
          />

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />

          <button
            className="send-btn"
            onClick={handleSend}
            disabled={(!text.trim() && !selectedImage) || disabled}
            id="send-btn"
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="input-disclaimer">
        MediAI is for informational purposes only. Always consult a qualified healthcare professional for medical advice.
      </div>
    </div>
  )
})

export default InputArea
