import { useState } from 'react'
import { fmtDateTime } from '../lib/format'

const SOURCE = { ai: 'AI', manual: 'Modifica tua', notes: 'Note applicate', reprocess: 'Da originale modificato', merge: 'Unione' }

export function EditBlockModal({ block, onClose, onSave }) {
  const [t, setT] = useState(block.current.title)
  const [b, setB] = useState(block.current.body)
  const [c, setC] = useState(block.current.closing_line)
  const [err, setErr] = useState('')
  const save = () => {
    if (!b.trim()) return setErr('Il testo non può essere vuoto.')
    onSave({ title: t.trim(), body: b.trim(), closing_line: c.trim() })
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
        <h3>Modifica mini-capitolo</h3>
        <label className="label">Titolo</label>
        <input className="input serif" value={t} onChange={e => setT(e.target.value)} style={{ margin: '6px 0 14px' }} />
        <label className="label">Testo</label>
        <textarea className="textarea serif" rows={14} value={b} onChange={e => { setB(e.target.value); setErr('') }} style={{ margin: '6px 0 14px', fontSize: 16 }} />
        <label className="label">Frase finale</label>
        <input className="input serif" value={c} onChange={e => setC(e.target.value)} style={{ margin: '6px 0 14px', fontStyle: 'italic' }} />
        {err && <p className="error">{err}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={save}>Salva come nuova versione</button>
        </div>
      </div>
    </div>
  )
}

export function VersionsModal({ block, onClose, onRestore }) {
  const list = [...block.versions].reverse()
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <h3>Versioni</h3>
        <p className="muted" style={{ fontSize: 13, marginTop: -8 }}>Quando approvi il blocco restano solo la versione approvata e il tuo originale.</p>
        {list.map(v => {
          const n = block.versions.indexOf(v) + 1
          const current = v.id === block.current_version_id
          return (
            <div key={v.id} className={`version ${current ? 'current' : ''}`}>
              <div className="row" style={{ marginBottom: 6 }}>
                <strong className="mono">v{n}</strong>
                <span className="muted" style={{ fontSize: 12 }}>{SOURCE[v.source] || v.source} · {fmtDateTime(v.created_at)}</span>
                <span className="spacer" />
                {current ? <span className="badge badge-red">Attuale</span> : <button className="btn btn-sm" onClick={() => onRestore(v)}>Ripristina</button>}
              </div>
              <div className="serif" style={{ fontWeight: 700 }}>{v.title}</div>
              <div className="serif muted" style={{ fontSize: 14, lineHeight: 1.5, marginTop: 4 }}>
                {v.body.length > 280 ? v.body.slice(0, 280) + '…' : v.body}
              </div>
            </div>
          )
        })}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  )
}
