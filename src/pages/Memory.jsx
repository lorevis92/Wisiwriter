import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getBook, updateBook } from '../lib/db'
import { notifyBookChanged } from '../lib/bookEvents'

export default function Memory() {
  const { bookId } = useParams()
  const [m, setM] = useState(null)
  const [title, setTitle] = useState('')
  const [style, setStyle] = useState('')
  const [memory, setMemory] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setM(null)
    getBook(bookId)
      .then(r => { setM(r); setTitle(r.title); setStyle(r.style_guide); setMemory(r.memory) })
      .catch(e => setError(e.message))
  }, [bookId])

  const dirty = m && (title.trim() !== m.title || style !== m.style_guide || memory !== m.memory)

  const save = async () => {
    if (!title.trim()) return setError('Il titolo del libro non può essere vuoto.')
    setError('')
    try {
      await updateBook(bookId, { title: title.trim(), style_guide: style, memory })
      if (title.trim() !== m.title) notifyBookChanged(bookId)
      setM({ ...m, title: title.trim(), style_guide: style, memory })
      setTitle(title.trim())
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
          <span className="label">Titolo del libro</span>
        </div>
        <input className="input serif" value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: 18 }} />
      </div>

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
        </div>
        <textarea className="textarea" rows={24} value={style} onChange={e => setStyle(e.target.value)} />
      </div>
    </>
  )
}
