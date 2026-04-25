import React, { useMemo } from 'react'
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import useWellStore from '../../store/wellStore'
import FeatureImportance from './FeatureImportance'

const DOWNSAMPLE = 3

const ZONE_COLORS = {
  productive: '#15803D',
  marginal: '#B45309',
  'non-productive': '#B91C1C',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-geo-panel border border-geo-border rounded-lg p-2 text-xs shadow-xl">
      <p className="text-geo-muted">Depth: <span className="text-geo-ink font-bold">{Number(label).toFixed(1)} m</span></p>
      <p style={{ color: d.fill }}>Score: <span className="font-bold">{Number(d.value).toFixed(3)}</span></p>
      <p className="text-geo-muted">Zone: <span className="font-semibold" style={{ color: d.fill }}>{payload[0]?.payload?.zone}</span></p>
    </div>
  )
}

export default function ProductivityChart() {
  const { predictions } = useWellStore()
  if (!predictions) return null

  const data = useMemo(() => {
    return predictions.depths
      .filter((_, i) => i % DOWNSAMPLE === 0)
      .map((d, i) => ({
        depth: d,
        score: predictions.productivity_score[i * DOWNSAMPLE],
        zone: predictions.zone_label[i * DOWNSAMPLE],
      }))
  }, [predictions])

  const counts = useMemo(() => {
    const c = { productive: 0, marginal: 0, 'non-productive': 0 }
    predictions.zone_label.forEach((z) => { if (c[z] !== undefined) c[z]++ })
    return c
  }, [predictions])

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-geo-panel border border-geo-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-geo-ink">
            Productivity Prediction
            <span className="ml-2 text-xs font-normal text-geo-faint">(XGBoost)</span>
          </h3>
          <div className="flex items-center gap-3">
            {Object.entries(ZONE_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                <span className="text-xs text-geo-muted capitalize">{key.replace('-', ' ')}</span>
                <span className="text-xs text-geo-faint">({counts[key]})</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 520 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 1]}
                tick={{ fill: '#475569', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                tickFormatter={(v) => v.toFixed(1)}
              />
              <YAxis
                type="number"
                dataKey="depth"
                reversed
                domain={['dataMin', 'dataMax']}
                tick={{ fill: '#475569', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                width={52}
                tickFormatter={(v) => `${v.toFixed(0)}m`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={0.5} stroke="#94A3B8" strokeDasharray="4 4" />
              <ReferenceLine x={0.35} stroke="#94A3B8" strokeDasharray="2 4" strokeOpacity={0.5} />
              <Bar dataKey="score" maxBarSize={8} isAnimationActive={false}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={ZONE_COLORS[entry.zone] || '#94A3B8'} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex gap-2 text-xs text-geo-muted">
          <span className="text-geo-faint">Thresholds:</span>
          <span><span className="text-geo-green font-medium">Productive</span> &gt; 0.5</span>
          <span className="text-geo-faint">|</span>
          <span><span className="text-geo-yellow font-medium">Marginal</span> 0.35–0.5</span>
          <span className="text-geo-faint">|</span>
          <span><span className="text-geo-red font-medium">Non-productive</span> &lt; 0.35</span>
        </div>
      </div>

      {predictions.feature_importance && (
        <FeatureImportance data={predictions.feature_importance} />
      )}
    </div>
  )
}
