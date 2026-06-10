import { useEffect, useRef } from 'react'

/**
 * Shows streaming output from the local Jarvis agent.
 * Appears as a terminal-style panel when a power command is running.
 */
export default function AgentOutput({ lines, running, onClose }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  if (!lines.length && !running) return null

  return (
    <div className="agent-output-overlay">
      <div className="agent-output-panel">
        <div className="agent-output-header">
          <span className="agent-output-title">
            {running ? '⬛ JARVIS AGENT · RUNNING' : '✓ JARVIS AGENT · DONE'}
          </span>
          {!running && (
            <button className="agent-output-close" onClick={onClose}>✕ CLOSE</button>
          )}
        </div>
        <div className="agent-output-body">
          {lines.map((line, i) => (
            <div key={i} className={`agent-line agent-line--${line.type}`}>
              {line.type === 'tool' && (
                <span className="agent-tool-badge">⚙ {line.name}</span>
              )}
              {line.text && <span>{line.text}</span>}
            </div>
          ))}
          {running && <div className="agent-cursor">▌</div>}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
