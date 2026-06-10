import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useState } from 'react'

// Placeholder — replace with real YouTube Data API, Instagram Graph API, Facebook Graph API
const ACCOUNTS = [
  {
    platform: 'YouTube',
    color: '#ff4444',
    accounts: [
      { name: 'Main Channel', views: 142000, subs: 28400, revenue: 1820 },
      { name: 'Clips', views: 43000, subs: 8200, revenue: 310 },
    ]
  },
  {
    platform: 'Instagram',
    color: '#e1306c',
    accounts: [
      { name: '@main', views: 98000, subs: 62000, revenue: 540 },
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

const flat = ACCOUNTS.flatMap(p => p.accounts.map(a => ({
  ...a,
  label: a.name,
  platform: p.platform,
  color: p.color,
})))

const METRICS = ['views', 'subs', 'revenue']
const LABELS = { views: 'Views', subs: 'Followers/Subs', revenue: 'Revenue ($)' }
const fmtNum = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{ background: '#0d0d1a', border: '1px solid rgba(79,195,247,0.2)', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
      <div style={{ color: d.payload.color, marginBottom: 4 }}>{d.payload.platform} · {label}</div>
      <div style={{ color: '#fff' }}>{LABELS[d.dataKey]}: <strong>{fmtNum(d.value)}</strong></div>
    </div>
  )
}

export default function SocialCard() {
  const [metric, setMetric] = useState('views')

  return (
    <div className="card social-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Social Media</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {METRICS.map(m => (
            <button key={m} className={`rev-tab ${metric === m ? 'active' : ''}`} onClick={() => setMetric(m)} style={{ fontSize: 10, padding: '3px 10px' }}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 8 }}>
        {ACCOUNTS.map(p => (
          <div key={p.platform} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#888' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
            {p.platform}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={flat} margin={{ top: 4, right: 4, left: -20, bottom: 20 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#555', fontSize: 10 }}
              angle={-25}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fill: '#444', fontSize: 10 }} tickFormatter={fmtNum} />
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
