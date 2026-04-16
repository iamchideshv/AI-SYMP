import { useState, useCallback, useEffect } from 'react'

export function useChat() {
  const [messages, setMessages] = useState(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem('inferadx_messages')
    return saved ? JSON.parse(saved) : []
  })
  const [isTyping, setIsTyping] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentModel, setCurrentModel] = useState("Groq Llama 3.3")

  // Persist messages whenever they change
  useEffect(() => {
    // Only persist non-blob images (or just exclude images for storage)
    const toSave = messages.map(m => ({ ...m, imageUrl: m.imageUrl?.startsWith('blob:') ? null : m.imageUrl }))
    localStorage.setItem('inferadx_messages', JSON.stringify(toSave))
  }, [messages])

  const sendMessage = useCallback(async (text, image = null) => {
    if ((!text.trim() && !image) || isTyping) return

    const imageUrl = image ? URL.createObjectURL(image) : null
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text.trim(),
      imageUrl: imageUrl
    }

    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)
    if (image) setIsAnalyzing(true)

    try {
      let response;
      
      const formData = new FormData();
      formData.append('message', text.trim() || (image ? "Analyzing image symptoms." : ""));
      formData.append('history', JSON.stringify(messages.map(m => ({ role: m.role, content: m.content }))));
      if (image) {
        formData.append('image', image);
      }

      response = await fetch("/api/chat", {
        method: "POST",
        body: formData
        // Note: Browser automatically sets Content-Type to multipart/form-data with boundary
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorDetail = errorData.detail;
        if (typeof errorDetail === 'object') {
          errorDetail = JSON.stringify(errorDetail);
        }
        throw new Error(`API returned ${response.status}: ${errorDetail || 'Unknown error'}`);
      }

      const data = await response.json();
      if (data.model_used) {
        setCurrentModel(data.model_used)
      }

      const aiMessage = {
        id: Date.now() + 1,
        role: 'ai',
        content: data.message || data.insight || data.question || "I'm having trouble analyzing this right now.",
        insight: data.insight,
        question: data.question,
        diagnoses: data.diagnoses || [],
        model_used: data.model_used,
        phase: data.phase
      }

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error("[useChat] Fetch error:", err);
      
      const isConnectionError = err.message.includes("Failed to fetch") || err.message.includes("NetworkError");

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        isError: true,
        content: isConnectionError 
          ? "Error: Could not connect to the diagnostic backend. Please ensure the server is active."
          : `Error: ${err.message}`
      }]);
    } finally {
      setIsTyping(false);
      setIsAnalyzing(false);
    }
  }, [isTyping, messages])

  const clearMessages = useCallback(() => {
    setMessages([])
    setIsTyping(false)
    setIsAnalyzing(false)
    localStorage.removeItem('inferadx_messages')
  }, [])

  return { messages, isTyping, isAnalyzing, currentModel, sendMessage, clearMessages }
}
