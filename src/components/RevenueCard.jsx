// ─────────────────────────────────────────────────────────────
// DATA SOURCE: MOCK object below.
// To go live:
//   Stripe     → add CLAUDE_API_KEY in Vercel env, then call Stripe API from api/chat.js
//                Stripe secret key must NEVER go in browser — backend only
//   RevenueCat → same — call from a backend route, return data here via fetch
//   Era Context → mcp__Era_Context__insights__get_cash_flow (already wired in this session)
// Replace MOCK values with fetch() calls to your backend routes.
// ─────────────────────────────────────────────────────────────

const MOCK = {
  day:   { total: 1247.50,  sources: [{ name: 'Stripe', amount: 820.00,   color: '#635bff' }, { name: 'RevenueCat', amount: 317.50,  color: '#ff6b35' }, { name: 'Era Context', amount: 110.00,  color: '#69f0ae' }] },
  week:  { total: 8340.00,  sources: [{ name: 'Stripe', amount: 5200.00,  color: '#635bff' }, { name: 'RevenueCat', amount: 2340.00, color: '#ff6b35' }, { name: 'Era Context', amount: 800.00,  color: '#69f0ae' }] },
  month: { total: 34820.00, sources: [{ name: 'Stripe', amount: 22000.00, color: '#635bff' }, { name: 'RevenueCat', amount: 9820.00, color: '#ff6b35' }, { name: 'Era Context', amount: 3000.00, color: '#69f0ae' }] },
}

const fmt = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const PERIOD_LABEL = { day: 'Today', week: 'This Week', month: 'This Month' }

// period and onPeriodChange come from App — Jarvis can switch them via voice
export default function RevenueCard({ period, onPeriodChange }) {
  const data = MOCK[period]
  const max  = Math.max(...data.sources.map(s => s.amount))

  return (
    <div className="card revenue-card">
      <div className="card-title">Revenue</div>
      <div className="revenue-tabs">
        {['day', 'week', 'month'].map(p => (
          <button key={p} className={`rev-tab ${period === p ? 'active' : ''}`} onClick={() => onPeriodChange(p)}>
            {p.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="revenue-total">{fmt(data.total)}</div>
      <div className="revenue-period-label">{PERIOD_LABEL[period]}</div>
      <div className="revenue-sources">
        {data.sources.map(src => (
          <div key={src.name}>
            <div className="rev-source-row">
              <div className="rev-source-name">
                <div className="rev-dot" style={{ background: src.color }} />
                {src.name}
              </div>
              <div className="rev-source-amount">{fmt(src.amount)}</div>
            </div>
            <div className="rev-bar-track">
              <div className="rev-bar-fill" style={{ width: `${(src.amount / max) * 100}%`, background: src.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="rev-note">* Add API keys to show live data</div>
    </div>
  )
}
