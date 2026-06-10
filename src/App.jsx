import { useState, useCallback, useRef } from 'react'
import ClockCard from './components/ClockCard'
import TodoCard from './components/TodoCard'
import RevenueCard from './components/RevenueCard'
import SocialCard from './components/SocialCard'
import JarvisPanel from './components/JarvisPanel'
import AgentOutput from './components/AgentOutput'

const TODO_KEY = 'jarvis_todos'
const LOCAL_AGENT = 'http://localhost:3001'
const todayStr = () => new Date().toDateString()

function loadTodos() {
  try { return JSON.parse(localStorage.getItem(TODO_KEY)) || [] } catch { return [] }
}

export default function App() {
  // ── Shared dashboard state ──
  const [todos, setTodos] = useState(loadTodos)
  const [revenuePeriod, setRevenuePeriod] = useState('day')
  const [socialMetric, setSocialMetric] = useState('views')
  const [jarvisPosition, setJarvisPosition] = useState('center')

  // ── Voice / Jarvis state ──
  const [message, setMessage] = useState(null)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)

  // ── Local agent state ──
  const [localAgentOnline, setLocalAgentOnline] = useState(false)
  const [agentLines, setAgentLines] = useState([])
  const [agentRunning, setAgentRunning] = useState(false)

  // Check if local agent is reachable (checked on each voice command)
  const checkLocalAgent = useCallback(async () => {
    try {
      const r = await fetch(`${LOCAL_AGENT}/health`, { signal: AbortSignal.timeout(800) })
      const ok = r.ok
      setLocalAgentOnline(ok)
      return ok
    } catch {
      setLocalAgentOnline(false)
      return false
    }
  }, [])

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

  // ── Dashboard tool calls from Vercel /api/chat ──
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
        const next = loadTodos().map(t =>
          t.date === todayStr() && t.text.toLowerCase().includes(input.text.toLowerCase()) ? { ...t, done: true } : t
        )
        saveTodos(next)
        return `Marked done: ${input.text}`
      }
      case 'delete_todo': {
        const next = loadTodos().filter(t =>
          !(t.date === todayStr() && t.text.toLowerCase().includes(input.text.toLowerCase()))
        )
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

  // ── Route to local agent (streaming) ──
  const runLocalAgent = useCallback(async (prompt, context) => {
    setAgentLines([])
    setAgentRunning(true)
    speak("On it. Check the agent panel for progress.")

    try {
      const res = await fetch(`${LOCAL_AGENT}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context })
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop()
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(part.slice(6))
            if (ev.type === 'text' && ev.text) {
              setAgentLines(l => [...l, { type: 'text', text: ev.text }])
            }
            if (ev.type === 'tool') {
              setAgentLines(l => [...l, { type: 'tool', name: ev.name, text: JSON.stringify(ev.input).slice(0, 80) }])
            }
            if (ev.type === 'done') {
              setAgentRunning(false)
              speak("Done. Check the agent panel.")
            }
            if (ev.type === 'error') {
              setAgentLines(l => [...l, { type: 'error', text: `Error: ${ev.message}` }])
              setAgentRunning(false)
              speak("Something went wrong. Check the agent panel.")
            }
          } catch {}
        }
      }
    } catch (err) {
      setAgentLines(l => [...l, { type: 'error', text: `Could not reach local agent: ${err.message}` }])
      setAgentRunning(false)
      speak("I can't reach the local agent server. Make sure it's running on your PC.")
    }
  }, [speak])

  // ── Send transcript → decide: local agent or Vercel /api/chat ──
  const handleTranscript = useCallback(async (transcript) => {
    setMessage(`You: "${transcript}"`)

    const context = {
      jarvisPosition, revenuePeriod, socialMetric,
      todayTodoCount: loadTodos().filter(t => t.date === todayStr()).length
    }

    // Check if local agent is online
    const agentOnline = await checkLocalAgent()

    try {
      // Ask Claude (via Vercel) whether this needs the local agent or just chat
      // Use local agent's chat endpoint when online (works in local dev), fallback to Vercel
      const chatUrl = agentOnline ? `${LOCAL_AGENT}/chat` : '/api/chat'
      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, context, localAgentOnline: agentOnline })
      })
      const { toolCalls = [], text, error, routeToAgent, agentPrompt } = await res.json()
      if (error) { speak("Sorry, I had trouble with that."); return }

      // If Claude says to route to local agent, do it
      if (routeToAgent && agentOnline) {
        await runLocalAgent(agentPrompt || transcript, context)
        return
      }

      // Otherwise handle dashboard tools + speak
      for (const { name, input } of toolCalls) executeTool(name, input)
      if (text) speak(text)
    } catch {
      speak("I couldn't reach my brain. Check your API key.")
    }
  }, [jarvisPosition, revenuePeriod, socialMetric, executeTool, speak, checkLocalAgent, runLocalAgent])

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

      <JarvisPanel
        position={jarvisPosition}
        speaking={speaking}
        listening={listening}
        message={message}
        onMicClick={handleMic}
        onPositionChange={setJarvisPosition}
        localAgentOnline={localAgentOnline}
      />

      <AgentOutput
        lines={agentLines}
        running={agentRunning}
        onClose={() => setAgentLines([])}
      />
    </div>
  )
}
