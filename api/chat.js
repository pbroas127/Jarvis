import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

// Tools Jarvis can use to control the dashboard
const TOOLS = [
  {
    name: 'move_jarvis',
    description: 'Move the Jarvis orb panel to a different corner or back to center of the screen.',
    input_schema: {
      type: 'object',
      properties: {
        position: {
          type: 'string',
          enum: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
          description: 'Where to move the Jarvis panel on screen.'
        }
      },
      required: ['position']
    }
  },
  {
    name: 'add_todo',
    description: 'Add a new task to today\'s to-do list.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The task to add.' }
      },
      required: ['text']
    }
  },
  {
    name: 'complete_todo',
    description: 'Mark a to-do item as done by matching its text.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Partial or full text of the task to mark complete.' }
      },
      required: ['text']
    }
  },
  {
    name: 'delete_todo',
    description: 'Delete a to-do item by matching its text.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Partial or full text of the task to delete.' }
      },
      required: ['text']
    }
  },
  {
    name: 'set_revenue_period',
    description: 'Switch the revenue card to show day, week, or month totals.',
    input_schema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['day', 'week', 'month'] }
      },
      required: ['period']
    }
  },
  {
    name: 'set_social_metric',
    description: 'Switch the social media chart to display views, subs (followers), or revenue.',
    input_schema: {
      type: 'object',
      properties: {
        metric: { type: 'string', enum: ['views', 'subs', 'revenue'] }
      },
      required: ['metric']
    }
  },
  {
    name: 'speak',
    description: 'Respond verbally to the user without making any dashboard changes.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'What to say back to the user.' }
      },
      required: ['message']
    }
  }
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { transcript, context } = req.body
  if (!transcript) return res.status(400).json({ error: 'transcript required' })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are Jarvis, a smart personal AI assistant running as a dashboard widget.
You control a productivity dashboard with: a clock, to-do list, social media stats (YouTube, Instagram, Facebook), and revenue data (Stripe, RevenueCat, Era Context).
You can move yourself, manage todos, and switch what data is displayed.
Always use a tool to take action or respond. Be concise and confident — you're Jarvis.
Current dashboard context: ${JSON.stringify(context || {})}`,
      messages: [{ role: 'user', content: transcript }],
      tools: TOOLS,
      tool_choice: { type: 'any' }
    })

    const toolCalls = response.content
      .filter(b => b.type === 'tool_use')
      .map(b => ({ name: b.name, input: b.input }))

    res.json({ toolCalls })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
