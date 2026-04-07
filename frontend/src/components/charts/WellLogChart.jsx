import React, { useMemo } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import useWellStore from '../../store/wellStore'

const DOWNSAMPLE = 4 // show every Nth point for performance

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-geo-panel border border-geo-border rounded-lg p-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">Depth: <span className="text-white font-bold">{Number(label).toFixed(1)} m</span></p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{Number(p.value).toFixed(2)}</span>
        </p>
      ))}
    </div>
  )
}

function TrackChart({ data, dataKey, name, color, unit, domain }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
        <XAxis
          type="number"
          domain={domain || ['auto', 'auto']}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: '#1f2937' }}
          unit={unit}
        />
        <YAxis
          type="number"
          dataKey="depth"
          reversed
          domain={['dataMin', 'dataMax']}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: '#1f2937' }}
          width={52}
          tickFormatter={(v) => `${v.toFixed(0)}m`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          dot={false}
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
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
        GR: wellLog.GR[i * DOWNSAMPLE],
        Resistivity: wellLog.Resistivity[i * DOWNSAMPLE],
        Density: wellLog.Density?.[i * DOWNSAMPLE],
        NeutronPorosity: wellLog.NeutronPorosity?.[i * DOWNSAMPLE],
        Sonic: wellLog.Sonic?.[i * DOWNSAMPLE],
      }))
  }, [wellLog])

  return (
    <div className="bg-geo-panel border border-geo-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Well Log Data</h3>
        <span className="text-xs text-slate-500">({data.length} plotted points)</span>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-geo-accent" />
            <span className="text-xs text-slate-400">GR (API)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-orange-400" />
            <span className="text-xs text-slate-400">Resistivity (Ω·m)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4" style={{ height: 480 }}>
        <div className="flex flex-col">
          <p className="text-xs text-center text-geo-accent font-semibold mb-2 tracking-wider uppercase">
            Gamma Ray
          </p>
          <div className="flex-1">
            <TrackChart
              data={data}
              dataKey="GR"
              name="GR"
              color="#06b6d4"
              unit=" API"
            />
          </div>
        </div>
        <div className="flex flex-col">
          <p className="text-xs text-center text-orange-400 font-semibold mb-2 tracking-wider uppercase">
            Resistivity
          </p>
          <div className="flex-1">
            <TrackChart
              data={data}
              dataKey="Resistivity"
              name="Res"
              color="#fb923c"
              unit=" Ω·m"
            />
          </div>
        </div>
      </div>

      {wellLog.Density && (
        <div className="grid grid-cols-2 gap-4 mt-4" style={{ height: 300 }}>
          <div className="flex flex-col">
            <p className="text-xs text-center text-purple-400 font-semibold mb-2 tracking-wider uppercase">
              Density
            </p>
            <div className="flex-1">
              <TrackChart
                data={data}
                dataKey="Density"
                name="RHOB"
                color="#c084fc"
                unit=" g/cc"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <p className="text-xs text-center text-green-400 font-semibold mb-2 tracking-wider uppercase">
              Neutron Porosity
            </p>
            <div className="flex-1">
              <TrackChart
                data={data}
                dataKey="NeutronPorosity"
                name="NPHI"
                color="#4ade80"
                unit=" pu"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
