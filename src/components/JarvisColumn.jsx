import { Mic, MicOff } from 'lucide-react'

export default function JarvisColumn({ speaking, listening, message, onMicClick }) {
  return (
    <div className="jarvis-column">
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

      <button
        className={`mic-btn ${listening ? 'active' : ''}`}
        onClick={onMicClick}
        title="Click to speak"
      >
        {listening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      {message && (
        <div className="chat-bubble">{message}</div>
      )}
    </div>
  )
}
