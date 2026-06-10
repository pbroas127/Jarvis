import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

// Conversation history per-session (in-memory; resets on cold start)
const history = []

// Dashboard control tools — Claude uses these only when it makes sense
const DASHBOARD_TOOLS = [
  {
    name: 'move_jarvis',
    description: 'Move the Jarvis orb panel to a different position on screen.',
    input_schema: {
      type: 'object',
      properties: {
        position: { type: 'string', enum: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] }
      },
      required: ['position']
    }
  },
  {
    name: 'add_todo',
    description: 'Add a task to today\'s to-do list.',
    input_schema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text']
    }
  },
  {
    name: 'complete_todo',
    description: 'Mark a to-do item done by partial text match.',
    input_schema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text']
    }
  },
  {
    name: 'delete_todo',
    description: 'Delete a to-do item by partial text match.',
    input_schema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text']
    }
  },
  {
    name: 'set_revenue_period',
    description: 'Switch the revenue card between day, week, and month views.',
    input_schema: {
      type: 'object',
      properties: { period: { type: 'string', enum: ['day', 'week', 'month'] } },
      required: ['period']
    }
  },
  {
    name: 'set_social_metric',
    description: 'Switch the social media chart between views, subs, and revenue.',
    input_schema: {
      type: 'object',
      properties: { metric: { type: 'string', enum: ['views', 'subs', 'revenue'] } },
      required: ['metric']
    }
  }
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { transcript, context } = req.body
  if (!transcript) return res.status(400).json({ error: 'transcript required' })

  // Add user message to rolling history (keep last 20 turns)
  history.push({ role: 'user', content: transcript })
  if (history.length > 20) history.splice(0, history.length - 20)

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are Jarvis — a sharp, witty personal AI assistant, just like the one from Iron Man.
You live on a productivity dashboard. You can answer any question, help think through problems, write things, explain concepts, brainstorm ideas, do math, give advice — anything.
You also have optional tools to control the dashboard when the user asks: move yourself around the screen, manage their to-do list, or change what data is displayed.
Use tools only when the user is clearly asking for a dashboard action. Otherwise just respond conversationally.
Be concise, confident, and a little personality-forward — you're Jarvis, not a generic chatbot.
Keep spoken responses under 3 sentences when possible — this will be read aloud.
Current dashboard state: ${JSON.stringify(context || {})}`,
      messages: history,
      tools: DASHBOARD_TOOLS,
      tool_choice: { type: 'auto' }  // Claude decides whether to use tools or just talk
    })

    // Collect any tool calls
    const toolCalls = response.content
      .filter(b => b.type === 'tool_use')
      .map(b => ({ name: b.name, input: b.input }))

    // Collect any free-form text response
    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join(' ')
      .trim()

    // Add assistant reply to history
    const assistantContent = response.content
    history.push({ role: 'assistant', content: assistantContent })

    res.json({ toolCalls, text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
