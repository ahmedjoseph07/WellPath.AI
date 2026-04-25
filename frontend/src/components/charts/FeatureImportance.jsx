import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'

const FEATURE_LABELS = {
  GR: 'Gamma Ray',
  Resistivity: 'Resistivity',
  Density: 'Density',
  NeutronPorosity: 'Neutron Porosity',
  Sonic: 'Sonic',
  gr: 'Gamma Ray',
  resistivity: 'Resistivity',
  density: 'Density',
  neutron_porosity: 'Neutron Porosity',
  sonic: 'Sonic',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-geo-panel border border-geo-border rounded-lg p-2 text-xs shadow-xl">
      <p className="text-geo-ink">{payload[0]?.payload?.feature}</p>
      <p className="text-geo-accent font-bold">{(payload[0]?.value * 100).toFixed(1)}%</p>
    </div>
  )
}

export default function FeatureImportance({ data }) {
  const chartData = useMemo(() => {
    if (!data) return []
    return Object.entries(data)
      .map(([key, value]) => ({
        feature: FEATURE_LABELS[key] || key,
        importance: value,
      }))
      .sort((a, b) => b.importance - a.importance)
  }, [data])

  if (!chartData.length) return null

  return (
    <div className="bg-geo-panel border border-geo-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-geo-ink mb-4">
        XGBoost Feature Importance
      </h3>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 60, bottom: 4, left: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 1]}
              tick={{ fill: '#475569', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <YAxis
              type="category"
              dataKey="feature"
              tick={{ fill: '#475569', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={96}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="importance" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={`rgba(14,116,144,${0.4 + (0.6 * (chartData.length - index)) / chartData.length})`}
                />
              ))}
              <LabelList
                dataKey="importance"
                position="right"
                formatter={(v) => `${(v * 100).toFixed(1)}%`}
                style={{ fill: '#475569', fontSize: 10 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
