import React, { useRef, useState } from 'react'
import useWellStore from '../../store/wellStore'
import { uploadCSV } from '../../api/wellpath'

export default function UploadZone() {
  const { setWellLog, setLoading, setError, loading } = useWellStore()
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState(null)
  const inputRef = useRef(null)

  async function processFile(file) {
    if (!file || !file.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file')
      return
    }
    setFileName(file.name)
    setLoading('upload', true)
    setError(null)
    try {
      const data = await uploadCSV(file)
      setWellLog(data)
    } catch (e) {
      setError(e.message)
      setFileName(null)
    } finally {
      setLoading('upload', false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    processFile(file)
  }

  function onDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave() {
    setDragging(false)
  }

  function onChange(e) {
    const file = e.target.files[0]
    if (file) processFile(file)
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => !loading.upload && inputRef.current?.click()}
      className={`
        relative rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all
        ${dragging
          ? 'border-geo-accent bg-geo-accent-soft'
          : 'border-geo-border bg-geo-soft hover:border-geo-accent/50 hover:bg-geo-accent-soft'
        }
        ${loading.upload ? 'opacity-70 cursor-wait' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={onChange}
        disabled={loading.upload}
      />

      {loading.upload ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-geo-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-geo-muted">Uploading {fileName}...</p>
        </div>
      ) : fileName ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-geo-green/10 border border-geo-green/30 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </div>
          <p className="text-xs text-geo-green font-medium">{fileName}</p>
          <p className="text-xs text-geo-faint">Click to change</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-geo-panel border border-geo-border flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          </div>
          <p className="text-sm text-geo-ink font-medium">Drop CSV here</p>
          <p className="text-xs text-geo-muted">or click to browse</p>
          <p className="text-xs text-geo-faint mt-1">Accepts .csv files only</p>
        </div>
      )}
    </div>
  )
}
