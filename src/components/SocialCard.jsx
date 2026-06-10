import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// ─────────────────────────────────────────────────────────────
// DATA SOURCE: ACCOUNTS array below (mock data).
// To go live:
//   YouTube  → VITE_YOUTUBE_API_KEY  (YouTube Data API v3)
//   Instagram/Facebook → VITE_META_ACCESS_TOKEN (Meta Graph API)
// Replace each account's { views, subs, revenue } with API fetch results.
// ─────────────────────────────────────────────────────────────

const ACCOUNTS = [
  {
    platform: 'YouTube', color: '#ff4444',
    accounts: [
      { name: 'Main Channel', views: 142000, subs: 28400, revenue: 1820 },
      { name: 'Clips',        views: 43000,  subs: 8200,  revenue: 310  },
    ]
  },
  {
    platform: 'Instagram', color: '#e1306c',
    accounts: [
      { name: '@main',  views: 98000, subs: 62000, revenue: 540 },
      { name: '@brand', views: 31000, subs: 18000, revenue: 210 },
    ]
  },
  {
    platform: 'Facebook', color: '#1877f2',
    accounts: [
      { name: 'Page', views: 54000, subs: 34000, revenue: 120 },
    ]
  }
]

const flat    = ACCOUNTS.flatMap(p => p.accounts.map(a => ({ ...a, platform: p.platform, color: p.color })))
const LABELS  = { views: 'Views', subs: 'Followers', revenue: 'Revenue ($)' }
const fmtNum  = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{ background: '#0d0d1a', border: '1px solid rgba(79,195,247,0.2)', padding: '8px 12px', borderRadius: 8, fontSize: 11 }}>
      <div style={{ color: d.payload.color, marginBottom: 3 }}>{d.payload.platform} · {label}</div>
      <div style={{ color: '#fff' }}>{LABELS[d.dataKey]}: <strong>{fmtNum(d.value)}</strong></div>
    </div>
  )
}

// metric and onMetricChange come from App — Jarvis can change them via voice
export default function SocialCard({ metric, onMetricChange }) {
  return (
    <div className="card social-card">
      <div className="social-top">
        <div className="card-title" style={{ marginBottom: 0 }}>Social Media</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {['views', 'subs', 'revenue'].map(m => (
            <button key={m} className={`rev-tab ${metric === m ? 'active' : ''}`} onClick={() => onMetricChange(m)} style={{ fontSize: 9, padding: '2px 8px' }}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 6, flexShrink: 0 }}>
        {ACCOUNTS.map(p => (
          <div key={p.platform} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#666' }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: p.color }} />
            {p.platform}
          </div>
        ))}
      </div>

      <div className="social-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={flat} margin={{ top: 4, right: 4, left: -24, bottom: 22 }}>
            <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 9 }} angle={-20} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#444', fontSize: 9 }} tickFormatter={fmtNum} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,195,247,0.05)' }} />
            <Bar dataKey={metric} radius={[3, 3, 0, 0]}>
              {flat.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
