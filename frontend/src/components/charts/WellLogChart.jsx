import React, { useMemo } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import useWellStore from '../../store/wellStore'

const DOWNSAMPLE = 4

const TRACKS = [
  { key: 'GR',              name: 'Gamma Ray',        unit: ' API',   color: '#06b6d4', label: 'GR' },
  { key: 'Resistivity',     name: 'Resistivity',      unit: ' Ω·m',  color: '#fb923c', label: 'RES' },
  { key: 'Density',         name: 'Density',           unit: ' g/cc', color: '#c084fc', label: 'RHOB' },
  { key: 'NeutronPorosity', name: 'Neutron Porosity', unit: ' pu',   color: '#4ade80', label: 'NPHI' },
  { key: 'Sonic',           name: 'Sonic',             unit: ' μs/ft',color: '#fbbf24', label: 'DT' },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-geo-panel border border-geo-border rounded-lg p-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">
        Depth: <span className="text-white font-bold">{Number(label).toFixed(1)} m</span>
      </p>
      <p style={{ color: p.color }}>
        {p.name}: <span className="font-bold">{Number(p.value).toFixed(3)}</span>
      </p>
    </div>
  )
}

function TrackChart({ data, track }) {
  return (
    <div className="flex flex-col h-full">
      <p
        className="text-xs text-center font-semibold mb-2 tracking-wider uppercase"
        style={{ color: track.color }}
      >
        {track.name}
        <span className="ml-1 text-slate-600 normal-case font-normal">{track.unit.trim()}</span>
      </p>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
            <XAxis
              type="number"
              domain={['auto', 'auto']}
              tick={{ fill: '#94a3b8', fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: '#1f2937' }}
              unit={track.unit}
              tickCount={4}
            />
            <YAxis
              type="number"
              dataKey="depth"
              reversed
              domain={['dataMin', 'dataMax']}
              tick={{ fill: '#94a3b8', fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: '#1f2937' }}
              width={48}
              tickFormatter={(v) => `${v.toFixed(0)}m`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={track.key}
              name={track.label}
              stroke={track.color}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function WellLogChart() {
  const { wellLog } = useWellStore()
  if (!wellLog) return null

  const data = useMemo(() => {
    return wellLog.depths
      .filter((_, i) => i % DOWNSAMPLE === 0)
      .map((d, i) => ({
        depth: d,
        GR:              wellLog.GR?.[i * DOWNSAMPLE],
        Resistivity:     wellLog.Resistivity?.[i * DOWNSAMPLE],
        Density:         wellLog.Density?.[i * DOWNSAMPLE],
        NeutronPorosity: wellLog.NeutronPorosity?.[i * DOWNSAMPLE],
        Sonic:           wellLog.Sonic?.[i * DOWNSAMPLE],
      }))
  }, [wellLog])

  // Filter to tracks that actually have data
  const availableTracks = TRACKS.filter((t) => wellLog[t.key]?.length > 0)

  return (
    <div className="bg-geo-panel border border-geo-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Well Log Curves</h3>
        <span className="text-xs text-slate-500">({data.length} plotted points · every {DOWNSAMPLE}th sample)</span>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {availableTracks.map((t) => (
            <div key={t.key} className="flex items-center gap-1.5">
              <div className="w-3 h-0.5" style={{ background: t.color }} />
              <span className="text-xs text-slate-400">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3-column row: GR, Resistivity, Density */}
      <div className="grid grid-cols-3 gap-3" style={{ height: 420 }}>
        {availableTracks.slice(0, 3).map((track) => (
          <TrackChart key={track.key} data={data} track={track} />
        ))}
      </div>

      {/* 2-column row: NeutronPorosity, Sonic */}
      {availableTracks.length > 3 && (
        <div className="grid grid-cols-2 gap-3 mt-4" style={{ height: 320 }}>
          {availableTracks.slice(3).map((track) => (
            <TrackChart key={track.key} data={data} track={track} />
          ))}
        </div>
      )}
    </div>
  )
}
