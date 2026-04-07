const BASE = '/api'

async function handleResponse(res) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      msg = body.detail || body.message || JSON.stringify(body)
    } catch {
      msg = await res.text().catch(() => msg)
    }
    throw new Error(msg)
  }
  return res.json()
}

export async function getSyntheticData() {
  const res = await fetch(`${BASE}/synthetic`)
  return handleResponse(res)
}

export async function uploadCSV(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(res)
}

export async function runPrediction(wellLog) {
  const res = await fetch(`${BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wellLog),
  })
  return handleResponse(res)
}

export async function runOptimization(predictions, config) {
  // Backend expects a flat body: prediction fields + optional GA config fields
  const res = await fetch(`${BASE}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      depths: predictions.depths,
      productivity_score: predictions.productivity_score,
      zone_label: predictions.zone_label,
      feature_importance: predictions.feature_importance,
      waypoints: config?.waypoints ?? 8,
      population: config?.population ?? 50,
      generations: config?.generations ?? 80,
      dls_weight: config?.dls_weight ?? 0.3,
    }),
  })
  return handleResponse(res)
}
