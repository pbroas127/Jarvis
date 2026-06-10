import { useState } from 'react'

// Placeholder data — replace with real API calls to Stripe, RevenueCat, Era Context
const MOCK = {
  day: {
    total: 1247.50,
    sources: [
      { name: 'Stripe', amount: 820.00, color: '#635bff' },
      { name: 'RevenueCat', amount: 317.50, color: '#ff6b35' },
      { name: 'Era Context', amount: 110.00, color: '#69f0ae' },
    ]
  },
  week: {
    total: 8340.00,
    sources: [
      { name: 'Stripe', amount: 5200.00, color: '#635bff' },
      { name: 'RevenueCat', amount: 2340.00, color: '#ff6b35' },
      { name: 'Era Context', amount: 800.00, color: '#69f0ae' },
    ]
  },
  month: {
    total: 34820.00,
    sources: [
      { name: 'Stripe', amount: 22000.00, color: '#635bff' },
      { name: 'RevenueCat', amount: 9820.00, color: '#ff6b35' },
      { name: 'Era Context', amount: 3000.00, color: '#69f0ae' },
    ]
  }
}

const fmt = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function RevenueCard() {
  const [period, setPeriod] = useState('day')
  const data = MOCK[period]
  const max = Math.max(...data.sources.map(s => s.amount))

  return (
    <div className="card revenue-card">
      <div className="card-title">Revenue</div>
      <div className="revenue-tabs">
        {['day', 'week', 'month'].map(p => (
          <button key={p} className={`rev-tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {p.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="revenue-total">{fmt(data.total)}</div>
      <div className="revenue-label">Total {period === 'day' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}</div>
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
            <div className="rev-bar-track" style={{ marginTop: 6 }}>
              <div className="rev-bar-fill" style={{ width: `${(src.amount / max) * 100}%`, background: src.color }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#333', marginTop: 16, textAlign: 'right' }}>
        * Connect API keys in .env to show live data
      </div>
    </div>
  )
}
