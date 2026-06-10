import { useState, useCallback, useRef } from 'react'
import ClockCard from './components/ClockCard'
import TodoCard from './components/TodoCard'
import RevenueCard from './components/RevenueCard'
import SocialCard from './components/SocialCard'
import JarvisPanel from './components/JarvisPanel'

const TODO_KEY = 'jarvis_todos'
const todayStr = () => new Date().toDateString()

function loadTodos() {
  try { return JSON.parse(localStorage.getItem(TODO_KEY)) || [] } catch { return [] }
}

export default function App() {
  // ── Shared dashboard state that Jarvis can control ──
  const [todos, setTodos] = useState(loadTodos)
  const [revenuePeriod, setRevenuePeriod] = useState('day')
  const [socialMetric, setSocialMetric] = useState('views')
  const [jarvisPosition, setJarvisPosition] = useState('center') // center | top-left | top-right | bottom-left | bottom-right

  // ── Voice / Jarvis state ──
  const [message, setMessage] = useState(null)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)

  // ── Persist todos ──
  const saveTodos = (next) => {
    setTodos(next)
    localStorage.setItem(TODO_KEY, JSON.stringify(next))
  }

  // ── TTS ──
  const speak = useCallback((text) => {
    if (!text) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.95
    utt.pitch = 0.85
    utt.onstart = () => { setMessage(text); setSpeaking(true) }
    utt.onend   = () => { setSpeaking(false); setTimeout(() => setMessage(null), 4000) }
    window.speechSynthesis.speak(utt)
  }, [])

  // ── Process tool calls returned by Claude ──
  const executeTool = useCallback((name, input) => {
    switch (name) {
      case 'move_jarvis':
        setJarvisPosition(input.position)
        return `Moving to ${input.position}.`

      case 'add_todo': {
        const next = [...loadTodos(), { id: Date.now(), text: input.text, done: false, date: todayStr() }]
        saveTodos(next)
        return `Added: ${input.text}`
      }

      case 'complete_todo': {
        const current = loadTodos()
        const lower = input.text.toLowerCase()
        const next = current.map(t =>
          t.date === todayStr() && t.text.toLowerCase().includes(lower) ? { ...t, done: true } : t
        )
        saveTodos(next)
        return `Marked done: ${input.text}`
      }

      case 'delete_todo': {
        const current = loadTodos()
        const lower = input.text.toLowerCase()
        const next = current.filter(t => !(t.date === todayStr() && t.text.toLowerCase().includes(lower)))
        saveTodos(next)
        return `Deleted task matching: ${input.text}`
      }

      case 'set_revenue_period':
        setRevenuePeriod(input.period)
        return `Showing ${input.period} revenue.`

      case 'set_social_metric':
        setSocialMetric(input.metric)
        return `Showing ${input.metric} on social chart.`

      default:
        return null
    }
  }, [])

  // ── Send transcript to /api/chat, run tools + speak any text reply ──
  const handleTranscript = useCallback(async (transcript) => {
    setMessage(`You: "${transcript}"`)
    try {
      const context = {
        jarvisPosition,
        revenuePeriod,
        socialMetric,
        todayTodoCount: loadTodos().filter(t => t.date === todayStr()).length
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, context })
      })
      const { toolCalls = [], text, error } = await res.json()
      if (error) { speak("Sorry, I had trouble with that."); return }

      // Run any dashboard tool calls
      for (const { name, input } of toolCalls) {
        executeTool(name, input)
      }

      // Speak the free-form text response (always present when Claude just talks)
      if (text) speak(text)
    } catch {
      speak("I couldn't reach my brain. Check your API key.")
    }
  }, [jarvisPosition, revenuePeriod, socialMetric, executeTool, speak])

  // ── Mic button ──
  const handleMic = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      speak("Speech recognition requires Chrome or Edge.")
      return
    }
    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    recRef.current = rec
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onstart  = () => setListening(true)
    rec.onend    = () => setListening(false)
    rec.onerror  = () => setListening(false)
    rec.onresult = (e) => handleTranscript(e.results[0][0].transcript)
    rec.start()
  }, [listening, handleTranscript, speak])

  // Jarvis prompts on first daily visit
  const handleJarvisPrompt = useCallback((text) => {
    setTimeout(() => speak(text), 800)
    setMessage(text)
  }, [speak])

  return (
    <div className="dashboard">
      <ClockCard />
      <TodoCard
        todos={todos}
        onSaveTodos={saveTodos}
        onJarvisPrompt={handleJarvisPrompt}
        userName={import.meta.env.VITE_USER_NAME || 'Boss'}
      />
      <SocialCard metric={socialMetric} onMetricChange={setSocialMetric} />
      <RevenueCard period={revenuePeriod} onPeriodChange={setRevenuePeriod} />

      {/* Jarvis floats — position controlled by voice or drag */}
      <JarvisPanel
        position={jarvisPosition}
        speaking={speaking}
        listening={listening}
        message={message}
        onMicClick={handleMic}
        onPositionChange={setJarvisPosition}
      />
    </div>
  )
}
