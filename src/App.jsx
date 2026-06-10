import { useState, useCallback } from 'react'
import ClockCard from './components/ClockCard'
import TodoCard from './components/TodoCard'
import RevenueCard from './components/RevenueCard'
import SocialCard from './components/SocialCard'
import JarvisOrb from './components/JarvisOrb'

export default function App() {
  const [message, setMessage] = useState(null)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)

  const speak = useCallback((text) => {
    if (!text) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.95
    utt.pitch = 0.85
    utt.onstart = () => { setMessage(text); setSpeaking(true) }
    utt.onend = () => { setSpeaking(false); setTimeout(() => setMessage(null), 3000) }
    window.speechSynthesis.speak(utt)
  }, [])

  const handleJarvisPrompt = useCallback((text) => {
    setTimeout(() => speak(text), 800)
    setMessage(text)
  }, [speak])

  const handleMic = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      speak("Speech recognition is not supported in this browser. Try Chrome.")
      return
    }
    if (listening) { setListening(false); return }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false

    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setMessage(`You: "${transcript}"`)
      setTimeout(() => speak(`I heard: ${transcript}. Claude API integration coming soon.`), 500)
    }

    rec.start()
  }, [listening, speak])

  return (
    <div className="dashboard">
      <ClockCard />
      <TodoCard onJarvisPrompt={handleJarvisPrompt} userName="Boss" />
      <SocialCard />
      <RevenueCard />
      <JarvisOrb
        speaking={speaking}
        listening={listening}
        message={message}
        onMicClick={handleMic}
      />
    </div>
  )
}
