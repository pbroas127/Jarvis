import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

const history = []

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
    description: "Add a task to today's to-do list.",
    input_schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }
  },
  {
    name: 'complete_todo',
    description: 'Mark a to-do item done by partial text match.',
    input_schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }
  },
  {
    name: 'delete_todo',
    description: 'Delete a to-do item by partial text match.',
    input_schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }
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
  },
  {
    name: 'route_to_local_agent',
    description: "Route this request to the local Jarvis agent running on the user's PC, which has full system access. Use this when the user wants to: write or edit files, run code or scripts, open a browser, generate and open a report, install packages, call external APIs that need a secret key stored locally, build something, create a chart from real data, do anything that requires actual computer access beyond a dashboard widget. Do NOT use for simple questions, to-do management, or dashboard control.",
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The refined, clear prompt to send to the local agent — include all relevant context the agent needs.'
        }
      },
      required: ['prompt']
    }
  }
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { transcript, context, localAgentOnline } = req.body
  if (!transcript) return res.status(400).json({ error: 'transcript required' })

  history.push({ role: 'user', content: transcript })
  if (history.length > 20) history.splice(0, history.length - 20)

  try {
    const agentNote = localAgentOnline
      ? "The user's local Jarvis agent is ONLINE — you can route complex system-level tasks to it using the route_to_local_agent tool."
      : 'The local Jarvis agent is OFFLINE — only dashboard controls and conversation are available.'

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are Jarvis — a sharp, witty personal AI assistant, just like the one from Iron Man.
You live on a productivity dashboard. You can answer any question, help think through problems, write things, explain concepts, brainstorm ideas, do math, give advice — anything.
You have tools to control the dashboard (move yourself, manage to-do list, change data views).
${agentNote}
Use tools only when clearly needed. Otherwise respond conversationally.
Be concise, confident, and personality-forward. Keep spoken responses under 3 sentences — this will be read aloud.
Current dashboard state: ${JSON.stringify(context || {})}`,
      messages: history,
      tools: DASHBOARD_TOOLS,
      tool_choice: { type: 'auto' }
    })

    // Check if Claude routed to local agent
    const agentCall = response.content.find(b => b.type === 'tool_use' && b.name === 'route_to_local_agent')
    if (agentCall) {
      history.push({ role: 'assistant', content: response.content })
      return res.json({ routeToAgent: true, agentPrompt: agentCall.input.prompt })
    }

    const toolCalls = response.content
      .filter(b => b.type === 'tool_use')
      .map(b => ({ name: b.name, input: b.input }))

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join(' ')
      .trim()

    history.push({ role: 'assistant', content: response.content })
    res.json({ toolCalls, text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
