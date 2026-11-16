import { useEffect, useRef, useState } from 'react'
import { aiTranscribe } from '../lib/ai'

const SEGMENT_MS = 8 * 60 * 1000 // spezza le registrazioni lunghe per stare sotto il limite di upload

function pickMime() {
  const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return opts.find(t => window.MediaRecorder?.isTypeSupported?.(t)) || ''
}

export default function Composer({ onSave, disabled }) {
  const [text, setText] = useState('')
  const [usedVoice, setUsedVoice] = useState(false)
  const [typed, setTyped] = useState(false)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState('')
  const streamRef = useRef(null)
  const recRef = useRef(null)
  const timerRef = useRef(null)
  const segStartRef = useRef(0)
  const stopAllRef = useRef(false)

  useEffect(() => () => stopEverything(), [])

  const appendText = t => {
    if (!t) return
    setText(prev => (prev.trim() ? `${prev.trimEnd()}\n\n${t.trim()}` : t.trim()))
  }

  const startSegment = () => {
    const mime = pickMime()
    const rec = new MediaRecorder(streamRef.current, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 })
    const chunks = []
    rec.ondataavailable = e => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
      if (!stopAllRef.current) startSegment()
      if (blob.size < 2000) return
      setPending(p => p + 1)
      try {
        const { text: t } = await aiTranscribe(blob)
        appendText(t)
        setUsedVoice(true)
      } catch (err) {
        setError(`Trascrizione non riuscita: ${err.message}`)
      } finally {
        setPending(p => p - 1)
      }
    }
    rec.start()
    recRef.current = rec
    segStartRef.current = Date.now()
  }

  const startRecording = async () => {
    setError('')
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return setError('Il microfono non è disponibile. Controlla i permessi del browser.')
    }
    stopAllRef.current = false
    const start = Date.now()
    setElapsed(0)
    setRecording(true)
    startSegment()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
      if (Date.now() - segStartRef.current > SEGMENT_MS && recRef.current?.state === 'recording') recRef.current.stop()
    }, 500)
  }

  function stopEverything() {
    stopAllRef.current = true
    clearInterval(timerRef.current)
    if (recRef.current?.state === 'recording') recRef.current.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setRecording(false)
  }

  const save = async process => {
    if (!text.trim()) return setError('Scrivi o registra qualcosa prima.')
    setError('')
    const type = usedVoice && typed ? 'mixed' : usedVoice ? 'voice' : 'text'
    const ok = await onSave(text.trim(), type, process)
    if (ok !== false) {
      setText('')
      setUsedVoice(false)
      setTyped(false)
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="composer">
      <div className="label" style={{ marginBottom: 8 }}>Continua a scrivere</div>
      <textarea
        className="textarea"
        rows={7}
        value={text}
        placeholder="Racconta la giornata come viene. Scrivi o premi il microfono, il testo trascritto finisce qui e puoi correggerlo prima di mandarlo all'AI."
        onChange={e => { setText(e.target.value); setTyped(true); setError('') }}
      />
      <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
        {!recording ? (
          <button className="btn" onClick={startRecording} disabled={disabled}>● Registra</button>
        ) : (
          <button className="btn" onClick={stopEverything} style={{ borderColor: 'var(--primaryBorder)' }}>
            <span className="rec-dot" /> <span className="mono">{mm}:{ss}</span> Stop
          </button>
        )}
        {pending > 0 && <span className="muted" style={{ fontSize: 12 }}>Trascrivo…</span>}
        <span className="spacer" />
        <button className="btn" onClick={() => save(false)} disabled={disabled || recording || pending > 0}>Salva soltanto</button>
        <button className="btn btn-primary" onClick={() => save(true)} disabled={disabled || recording || pending > 0}>Salva e rielabora</button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
