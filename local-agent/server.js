/**
 * Jarvis Local Agent Server
 * Runs on your PC at http://localhost:3001
 * Uses @anthropic-ai/sdk with real tool execution:
 *   - run shell commands (bash/cmd)
 *   - read/write files
 *   - open browser
 */

import express from 'express'
import cors from 'cors'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import Anthropic from '@anthropic-ai/sdk'

const execAsync = promisify(exec)
const app = express()
const PORT = 3001
const IS_WINDOWS = process.platform === 'win32'
const WORKSPACE = process.env.JARVIS_WORKSPACE || path.join(os.homedir(), 'JarvisWorkspace')

// Ensure workspace exists
fs.mkdir(WORKSPACE, { recursive: true }).catch(() => {})

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

app.use(cors())
app.use(express.json())

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'online', agent: 'Jarvis Local Agent', workspace: WORKSPACE }))

// ── Tools Jarvis can use ──────────────────────────────────────
const TOOLS = [
  {
    name: 'run_command',
    description: 'Run a shell command on the user\'s PC. Use for git, npm, python, file ops, etc.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The command to run' },
        cwd: { type: 'string', description: 'Working directory (optional, defaults to workspace)' }
      },
      required: ['command']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file on the user\'s PC.',
    input_schema: {
      type: 'object',
      properties: {
        filepath: { type: 'string', description: 'Absolute or workspace-relative path' },
        content: { type: 'string', description: 'File content' }
      },
      required: ['filepath', 'content']
    }
  },
  {
    name: 'read_file',
    description: 'Read a file from the user\'s PC.',
    input_schema: {
      type: 'object',
      properties: {
        filepath: { type: 'string', description: 'Absolute or workspace-relative path' }
      },
      required: ['filepath']
    }
  },
  {
    name: 'open_in_browser',
    description: 'Open a URL or local HTML file in the default browser.',
    input_schema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'URL or file path to open' }
      },
      required: ['target']
    }
  },
  {
    name: 'list_files',
    description: 'List files in a directory.',
    input_schema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Directory path (optional, defaults to workspace)' }
      },
      required: []
    }
  }
]

// ── Execute a tool call ───────────────────────────────────────
async function executeTool(name, input) {
  try {
    switch (name) {
      case 'run_command': {
        const cwd = input.cwd || WORKSPACE
        const { stdout, stderr } = await execAsync(input.command, { cwd, timeout: 30000, shell: IS_WINDOWS ? 'cmd.exe' : '/bin/bash' })
        return stdout || stderr || '(no output)'
      }
      case 'write_file': {
        const fp = path.isAbsolute(input.filepath) ? input.filepath : path.join(WORKSPACE, input.filepath)
        await fs.mkdir(path.dirname(fp), { recursive: true })
        await fs.writeFile(fp, input.content, 'utf8')
        return `Written: ${fp}`
      }
      case 'read_file': {
        const fp = path.isAbsolute(input.filepath) ? input.filepath : path.join(WORKSPACE, input.filepath)
        const content = await fs.readFile(fp, 'utf8')
        return content.slice(0, 8000)
      }
      case 'open_in_browser': {
        const cmd = IS_WINDOWS ? `start "" "${input.target}"` : process.platform === 'darwin' ? `open "${input.target}"` : `xdg-open "${input.target}"`
        await execAsync(cmd)
        return `Opened: ${input.target}`
      }
      case 'list_files': {
        const dir = input.directory || WORKSPACE
        const entries = await fs.readdir(dir, { withFileTypes: true })
        return entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n')
      }
      default:
        return 'Unknown tool'
    }
  } catch (err) {
    return `Error: ${err.message}`
  }
}

// ── Agent endpoint (streaming SSE) ───────────────────────────
app.post('/agent', async (req, res) => {
  const { prompt, context } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt required' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (type, data) => res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)

  const messages = [{ role: 'user', content: prompt }]

  const system = `You are Jarvis — a sharp, capable AI assistant running on the user's personal Windows PC with full system access.
Workspace directory: ${WORKSPACE}
You have tools to run shell commands, read/write files, open browsers, and list directories.
Be action-oriented. Do the task, don't just describe it. Report progress as you work.
For file paths, use the workspace unless the user specifies otherwise.
Current dashboard context: ${JSON.stringify(context || {})}`

  try {
    let turns = 0
    while (turns < 15) {
      turns++
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system,
        messages,
        tools: TOOLS,
        tool_choice: { type: 'auto' }
      })

      // Stream text blocks
      for (const block of response.content) {
        if (block.type === 'text' && block.text) {
          send('text', { text: block.text })
        }
        if (block.type === 'tool_use') {
          send('tool', { name: block.name, input: block.input })
        }
      }

      // If done, stop
      if (response.stop_reason === 'end_turn') {
        send('done', { text: 'Complete.' })
        break
      }

      // If tool use, execute and continue loop
      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content })
        const toolResults = []
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await executeTool(block.name, block.input)
            send('tool_result', { name: block.name, result: result.slice(0, 500) })
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
          }
        }
        messages.push({ role: 'user', content: toolResults })
      } else {
        send('done', { text: 'Complete.' })
        break
      }
    }
  } catch (err) {
    console.error(err)
    send('error', { message: err.message })
  }

  res.end()
})

app.listen(PORT, () => {
  console.log(`\n  Jarvis Local Agent running at http://localhost:${PORT}`)
  console.log(`  Workspace: ${WORKSPACE}`)
  console.log(`  Press Ctrl+C to stop\n`)
})
