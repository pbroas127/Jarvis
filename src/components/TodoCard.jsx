import { useState, useEffect } from 'react'

const LAST_SEEN_KEY = 'jarvis_last_seen'
const todayStr = () => new Date().toDateString()

// DATA SOURCE: todos array comes from App.jsx (stored in localStorage)
// Jarvis can add/complete/delete todos via voice — those go through App.jsx

export default function TodoCard({ todos, onSaveTodos, onJarvisPrompt, userName = 'Boss' }) {
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')

  // Prompt Jarvis on first daily visit with no tasks
  useEffect(() => {
    const last = localStorage.getItem(LAST_SEEN_KEY)
    const todayTodos = todos.filter(t => t.date === todayStr())
    if (last !== todayStr() && todayTodos.length === 0) {
      localStorage.setItem(LAST_SEEN_KEY, todayStr())
      onJarvisPrompt?.("Good morning! What are your priorities for today?")
    }
  }, [])

  const toggle = (id) =>
    onSaveTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const addTodo = () => {
    if (!input.trim()) return
    onSaveTodos([...todos, { id: Date.now(), text: input.trim(), done: false, date: todayStr() }])
    setInput('')
    setAdding(false)
  }

  const todayTodos = todos.filter(t => t.date === todayStr())

  return (
    <div className="card todo-card">
      <div className="todo-header">
        <div className="user-name">Hey, {userName} 👋</div>
        <button className="add-todo-btn" onClick={() => setAdding(a => !a)}>+ ADD</button>
      </div>
      <div className="card-title">Today's Tasks</div>

      <div className="todo-list">
        {todayTodos.length === 0 && !adding && (
          <div className="todo-empty">No tasks — ask Jarvis or hit + ADD</div>
        )}
        {todayTodos.map(todo => (
          <div key={todo.id} className={`todo-item ${todo.done ? 'done' : ''}`} onClick={() => toggle(todo.id)}>
            <div className="todo-check">
              {todo.done && (
                <svg width="9" height="9" viewBox="0 0 10 10">
                  <polyline points="2,5 4,7 8,3" stroke="#000" strokeWidth="1.5" fill="none" />
                </svg>
              )}
            </div>
            <span>{todo.text}</span>
          </div>
        ))}
      </div>

      {adding && (
        <div className="add-todo-form">
          <input
            className="add-todo-input"
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTodo(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="What needs to get done?"
          />
          <button className="add-todo-btn" onClick={addTodo}>Add</button>
        </div>
      )}
    </div>
  )
}
