/**
 * Jarvis Local Agent Server
 *
 * Runs on your personal computer at http://localhost:3001
 * Uses the Claude Code Agent SDK — full system access:
 *   write files, run code, open browser, call APIs, spawn processes, anything.
 *
 * The Vercel dashboard calls this for "power" commands.
 * Regular conversation still goes through Vercel's /api/chat.
 *
 * Start: node server.js  (or: npm start)
 */

import express from 'express'
import cors from 'cors'
import { query } from '@anthropic-ai/claude-code'

const app = express()
const PORT = 3001

// Allow requests from your Vercel dashboard (and localhost for dev)
app.use(cors({
  origin: (origin, cb) => cb(null, true) // allow all — tighten to your Vercel URL in production
}))
app.use(express.json())

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'online', agent: 'Jarvis Local Agent' }))

// ── Main agent endpoint ───────────────────────────────────────
app.post('/agent', async (req, res) => {
  const { prompt, context } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt required' })

  // Stream the response back as Server-Sent Events so the dashboard
  // can show progress in real time
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
  }

  try {
    const systemPrompt = `You are Jarvis — a sharp, capable AI assistant running on the user's personal computer with full system access.
You can write files, run code, open browsers, install packages, call APIs, generate reports, and do anything a developer could do in a terminal.
Be concise and action-oriented. Report what you're doing as you do it.
Current dashboard context: ${JSON.stringify(context || {})}
Current working directory: ${process.env.JARVIS_WORKSPACE || process.env.HOME + '/JarvisWorkspace'}`

    let fullText = ''

    // The query() function runs an agentic Claude Code loop with real tool access
    const stream = query({
      prompt,
      systemPrompt,
      options: {
        maxTurns: 20,
      }
    })

    for await (const event of stream) {
      if (event.type === 'assistant') {
        // Extract text from the assistant message
        const content = event.message?.content || []
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            fullText += block.text
            sendEvent('text', { text: block.text })
          }
          if (block.type === 'tool_use') {
            sendEvent('tool', { name: block.name, input: block.input })
          }
        }
      }
      if (event.type === 'result') {
        sendEvent('done', { text: fullText, cost: event.total_cost_usd })
        break
      }
    }

    res.end()
  } catch (err) {
    console.error('Agent error:', err)
    sendEvent('error', { message: err.message })
    res.end()
  }
})

// ── Simple one-shot (non-streaming) fallback ──────────────────
app.post('/agent/simple', async (req, res) => {
  const { prompt, context } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt required' })

  try {
    const systemPrompt = `You are Jarvis — a sharp, capable AI assistant running on the user's personal computer with full system access.
You can write files, run code, open browsers, install packages, call APIs, generate reports, and do anything a developer could do in a terminal.
Be concise. Current dashboard context: ${JSON.stringify(context || {})}`

    let result = ''
    const stream = query({ prompt, systemPrompt, options: { maxTurns: 20 } })

    for await (const event of stream) {
      if (event.type === 'result') {
        result = event.result || ''
        break
      }
    }

    res.json({ text: result })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`\n🤖 Jarvis Local Agent running at http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health`)
  console.log(`   Agent:  POST http://localhost:${PORT}/agent`)
  console.log(`\n   Press Ctrl+C to stop\n`)
})
