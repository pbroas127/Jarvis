import { Mic, MicOff, GripHorizontal } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'

// Snap positions relative to viewport (percentage-based)
const SNAP = {
  'center':       { x: '50%',  y: '50%',  tx: '-50%', ty: '-50%' },
  'top-left':     { x: '12%',  y: '12%',  tx: '0',    ty: '0'    },
  'top-right':    { x: '88%',  y: '12%',  tx: '-100%',ty: '0'    },
  'bottom-left':  { x: '12%',  y: '88%',  tx: '0',    ty: '-100%'},
  'bottom-right': { x: '88%',  y: '88%',  tx: '-100%',ty: '-100%'},
}

export default function JarvisPanel({ position, speaking, listening, message, onMicClick, onPositionChange }) {
  const panelRef = useRef(null)
  const dragState = useRef(null)
  const [dragging, setDragging] = useState(false)
  // pixel offset when dragging free
  const [freePos, setFreePos] = useState(null)

  // When position prop changes (via voice command), clear free pos
  useEffect(() => { setFreePos(null) }, [position])

  const snap = SNAP[position] || SNAP['center']

  const style = freePos
    ? { left: freePos.x, top: freePos.y, transform: 'translate(-50%, -50%)' }
    : { left: snap.x,    top: snap.y,    transform: `translate(${snap.tx}, ${snap.ty})` }

  // ── Drag logic ──
  const onMouseDown = (e) => {
    if (e.button !== 0) return
    const rect = panelRef.current.getBoundingClientRect()
    dragState.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startElemX:  rect.left + rect.width / 2,
      startElemY:  rect.top  + rect.height / 2,
    }
    setDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    const onMove = (e) => {
      if (!dragState.current) return
      const dx = e.clientX - dragState.current.startMouseX
      const dy = e.clientY - dragState.current.startMouseY
      setFreePos({
        x: dragState.current.startElemX + dx,
        y: dragState.current.startElemY + dy,
      })
    }
    const onUp = (e) => {
      if (!dragState.current) return
      dragState.current = null
      setDragging(false)
      // Snap to nearest corner based on drop position
      if (freePos) {
        const W = window.innerWidth, H = window.innerHeight
        const cx = freePos.x / W, cy = freePos.y / H
        // center zone
        if (cx > 0.3 && cx < 0.7 && cy > 0.3 && cy < 0.7) {
          onPositionChange('center')
        } else {
          const col = cx < 0.5 ? 'left' : 'right'
          const row = cy < 0.5 ? 'top'  : 'bottom'
          onPositionChange(`${row}-${col}`)
        }
        setFreePos(null)
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [freePos, onPositionChange])

  const isCorner = position !== 'center'

  return (
    <div
      ref={panelRef}
      className={`jarvis-panel ${isCorner ? 'jarvis-panel--corner' : ''} ${dragging ? 'jarvis-panel--dragging' : ''}`}
      style={{ ...style, position: 'fixed', zIndex: 100 }}
    >
      {/* Drag handle */}
      <div className="jarvis-drag-handle" onMouseDown={onMouseDown} title="Drag to move">
        <GripHorizontal size={14} />
      </div>

      <div className="jarvis-label">J.A.R.V.I.S</div>

      <div className={`orb-container ${isCorner ? 'orb-container--small' : ''}`}>
        <div className="orb-ring" />
        <div className="orb-ring" />
        <div className="orb-ring" />
        <div className={`orb ${speaking ? 'speaking' : ''} ${isCorner ? 'orb--small' : ''}`} />
      </div>

      <div className="jarvis-status">
        {listening ? '● Listening...' : speaking ? '● Speaking...' : '○ Standby'}
      </div>

      <button className={`mic-btn ${listening ? 'active' : ''}`} onClick={onMicClick} title="Click to speak">
        {listening ? <MicOff size={14} /> : <Mic size={14} />}
      </button>

      {message && (
        <div className={`chat-bubble ${isCorner ? 'chat-bubble--small' : ''}`}>{message}</div>
      )}
    </div>
  )
}
