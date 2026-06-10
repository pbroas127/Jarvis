import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useState } from 'react'

// ─────────────────────────────────────────────────────────────
// DATA SOURCE: Mock data below (ACCOUNTS array).
// To go live, replace each account's values with API calls:
//
//   YouTube  → Google / YouTube Data API v3
//              GET https://www.googleapis.com/youtube/v3/channels
//              Add key to .env: VITE_YOUTUBE_API_KEY
//              Docs: https://developers.google.com/youtube/v3
//
//   Instagram → Meta Graph API
//               GET /me/insights or /me/media
//               Add key to .env: VITE_META_ACCESS_TOKEN
//               Docs: https://developers.facebook.com/docs/instagram-api
//
//   Facebook  → Meta Graph API (same token as Instagram)
//               GET /{page-id}/insights
//               Add key to .env: VITE_META_ACCESS_TOKEN
// ─────────────────────────────────────────────────────────────

const ACCOUNTS = [
  {
    platform: 'YouTube',
    color: '#ff4444',
    accounts: [
      { name: 'Main Channel', views: 142000, subs: 28400, revenue: 1820 },
      { name: 'Clips',        views: 43000,  subs: 8200,  revenue: 310  },
    ]
  },
  {
    platform: 'Instagram',
    color: '#e1306c',
    accounts: [
      { name: '@main',  views: 98000, subs: 62000, revenue: 540 },
      { name: '@brand', views: 31000, subs: 18000, revenue: 210 },
    ]
  },
  {
    platform: 'Facebook',
    color: '#1877f2',
    accounts: [
      { name: 'Page', views: 54000, subs: 34000, revenue: 120 },
    ]
  }
]

const flat = ACCOUNTS.flatMap(p =>
  p.accounts.map(a => ({ ...a, platform: p.platform, color: p.color }))
)

const METRICS = ['views', 'subs', 'revenue']
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

export default function SocialCard() {
  const [metric, setMetric] = useState('views')

  return (
    <div className="card social-card">
      <div className="social-top">
        <div className="card-title" style={{ marginBottom: 0 }}>Social Media</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {METRICS.map(m => (
            <button key={m} className={`rev-tab ${metric === m ? 'active' : ''}`} onClick={() => setMetric(m)} style={{ fontSize: 9, padding: '2px 8px' }}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Platform legend */}
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
            <XAxis
              dataKey="name"
              tick={{ fill: '#555', fontSize: 9 }}
              angle={-20}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fill: '#444', fontSize: 9 }} tickFormatter={fmtNum} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,195,247,0.05)' }} />
            <Bar dataKey={metric} radius={[3, 3, 0, 0]}>
              {flat.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
