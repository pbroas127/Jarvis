import { Mic, MicOff } from 'lucide-react'

export default function JarvisOrb({ speaking, listening, message, onMicClick }) {
  return (
    <div className="jarvis-center">
      <div className="jarvis-label">J.A.R.V.I.S</div>

      <div className="orb-container">
        <div className="orb-ring" />
        <div className="orb-ring" />
        <div className="orb-ring" />
        <div className={`orb ${speaking ? 'speaking' : ''}`} />
      </div>

      <div className="jarvis-status">
        {listening ? '● Listening...' : speaking ? '● Speaking...' : '○ Standby'}
      </div>

      {message && (
        <div className="chat-bubble">{message}</div>
      )}

      <button className={`mic-btn ${listening ? 'active' : ''}`} onClick={onMicClick} title="Hold to speak">
        {listening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
    </div>
  )
}
