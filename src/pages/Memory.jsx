import { useEffect, useState } from 'react'
import { getMemory, saveMemory } from '../lib/db'
import { DEFAULT_STYLE_GUIDE } from '../config'

export default function Memory() {
  const [m, setM] = useState(null)
  const [style, setStyle] = useState('')
  const [memory, setMemory] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getMemory()
      .then(r => { setM(r); setStyle(r.style_guide); setMemory(r.memory) })
      .catch(e => setError(e.message))
  }, [])

  const dirty = m && (style !== m.style_guide || memory !== m.memory)

  const save = async () => {
    try {
      await saveMemory({ style_guide: style, memory })
      setM({ ...m, style_guide: style, memory })
      setMsg('Salvato')
      setTimeout(() => setMsg(''), 2000)
    } catch (e) {
      setError(e.message)
    }
  }

  if (!m) return <p className={error ? 'error' : 'muted'}>{error || 'Caricamento…'}</p>

  return (
    <>
      <div className="home-head">
        <div>
          <h1 className="home-title">Memoria del libro</h1>
          <div className="muted">L'AI la legge ogni volta che rielabora. Modificala quando vuoi.</div>
        </div>
        <div className="row">
          {msg && <span className="badge badge-green">{msg}</span>}
          <button className="btn btn-primary" onClick={save} disabled={!dirty}>Salva</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="label">Personaggi, ricorrenze e dettagli inventati</span>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Chi è chi, i soprannomi, le cose che tornano, e i prezzi o i nomi di indicatori che l'AI ha inventato, così restano uguali in tutto il libro. Si riempie anche con i suggerimenti che accetti nei capitoli.
        </p>
        <textarea className="textarea" rows={14} value={memory} onChange={e => setMemory(e.target.value)}
          placeholder={'- Marco: il collega che perde sempre ma è sempre sicuro di sé\n- Nel giorno 3 Nvidia era a 141,20 $'} />
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="label">Guida di stile</span>
          <span className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={() => window.confirm('Ripristinare la guida di stile iniziale?') && setStyle(DEFAULT_STYLE_GUIDE)}>
            Ripristina iniziale
          </button>
        </div>
        <textarea className="textarea" rows={24} value={style} onChange={e => setStyle(e.target.value)} />
      </div>
    </>
  )
}
