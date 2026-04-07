import React from 'react'
import useWellStore from '../../store/wellStore'

const COLUMNS = ['depths', 'GR', 'Resistivity', 'Density', 'NeutronPorosity', 'Sonic']
const LABELS = ['Depth (m)', 'GR (API)', 'Res (Ω·m)', 'Density (g/cc)', 'NP (%)', 'Sonic (μs/ft)']

export default function DataPreview() {
  const { wellLog } = useWellStore()
  if (!wellLog) return null

  const totalRows = wellLog.depths.length
  const previewRows = Math.min(10, totalRows)

  return (
    <div className="bg-geo-panel border border-geo-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200">Data Preview</h3>
        <span className="text-xs text-slate-400 bg-geo-dark px-2 py-0.5 rounded-full border border-geo-border">
          {totalRows.toLocaleString()} rows total — showing first {previewRows}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-geo-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-geo-dark border-b border-geo-border">
              {LABELS.map((label, i) => (
                <th key={i} className="px-3 py-2 text-left text-slate-400 font-semibold whitespace-nowrap">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: previewRows }).map((_, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b border-geo-border/50 ${rowIdx % 2 === 0 ? 'bg-geo-dark/30' : 'bg-transparent'} hover:bg-geo-accent/5 transition-colors`}
              >
                {COLUMNS.map((col, colIdx) => {
                  const val = wellLog[col]?.[rowIdx]
                  return (
                    <td key={colIdx} className="px-3 py-1.5 text-slate-300 font-mono whitespace-nowrap">
                      {val != null ? Number(val).toFixed(2) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
