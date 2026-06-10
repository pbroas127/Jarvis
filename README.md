# Jarvis Dashboard

A personal AI dashboard with voice control, to-do management, revenue tracking, and social metrics — powered by Claude.

## Architecture

```
[Vercel dashboard]  ←→  /api/chat (Claude — routing + conversation)
        ↕
[localhost:3001]  ←→  local-agent/server.js (Claude Code Agent SDK — full PC access)
```

**Regular commands** (questions, to-dos, dashboard control) → handled by Vercel.  
**Power commands** (write files, run code, open browser, build things) → routed to your local agent.

---

## Setup

### 1. Prerequisites
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- Chrome or Edge (for voice recognition)

### 2. Clone & install
```bash
git clone https://github.com/pbroas127/jarvis.git
cd jarvis
npm install
```

### 3. Environment
```bash
cp .env.example .env
# Edit .env and add your CLAUDE_API_KEY
```

### 4. Run the dashboard
```bash
npm run dev
# Opens at http://localhost:5173
```

### 5. Run the local agent (for power commands)
In a separate terminal:
```bash
cd local-agent
npm install
node server.js
```

Or just run the script:
```bash
bash local-agent/start.sh
```

The agent indicator in the Jarvis orb panel turns green when it's online.

---

## Power commands (requires local agent)
- *"Write me a Python script that..."*
- *"Generate a revenue report and open it in the browser"*
- *"Build a quick calculator app"*
- *"Pull my Stripe data and make a chart"*
- *"Create a folder called Projects on my Desktop"*

## Dashboard commands (Vercel only, no local agent needed)
- *"Add buy groceries to my list"*
- *"Show me weekly revenue"*
- *"Move to the top right"*
- *"What's 15% of 847?"*
- Any question or conversation

---

## Deploy to Vercel
```bash
npm i -g vercel
vercel
```
Add `CLAUDE_API_KEY` in Vercel → Settings → Environment Variables, then redeploy.

The local agent runs on your PC — Vercel talks to it via `http://localhost:3001`.  
For remote access (not on your PC), you'd need to expose the local agent via [ngrok](https://ngrok.com) or Tailscale.
