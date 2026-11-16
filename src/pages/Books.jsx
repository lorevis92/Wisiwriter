import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listBooks, createBook } from '../lib/db'

export default function Books() {
  const [books, setBooks] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const [title, setTitle] = useState('')
  const [styleFrom, setStyleFrom] = useState('copy') // 'copy' | 'empty'
  const [sourceId, setSourceId] = useState('')
  const [formErr, setFormErr] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    listBooks().then(setBooks).catch(e => setError(e.message))
  }, [])

  const openModal = () => {
    setTitle('')
    setStyleFrom(books?.length ? 'copy' : 'empty')
    setSourceId(books?.[0]?.id || '')
    setFormErr('')
    setModal(true)
  }

  const add = async e => {
    e.preventDefault()
    if (!title.trim()) return setFormErr('Dai un titolo al libro.')
    const source = styleFrom === 'copy' ? books.find(b => b.id === sourceId) : null
    if (styleFrom === 'copy' && !source) return setFormErr('Scegli il libro da cui copiare la guida di stile.')
    setSaving(true)
    try {
      const b = await createBook({ title: title.trim(), style_guide: source ? source.style_guide : '' })
      navigate(`/libro/${b.id}`)
    } catch (err) {
      setFormErr(err.message)
      setSaving(false)
    }
  }

  return (
    <>
      <div className="home-head">
        <div>
          <h1 className="home-title">I tuoi libri</h1>
          {books && (
            <div className="muted">
              <span className="mono">{books.length}</span> {books.length === 1 ? 'libro' : 'libri'}
            </div>
          )}
        </div>
        <button className="btn btn-primary" onClick={openModal}>+ Nuovo libro</button>
      </div>

      {error && <p className="error">{error}</p>}
      {!books && !error && <p className="muted">Caricamento…</p>}

      {books && books.length === 0 && (
        <div className="card empty">
          <h2 className="serif" style={{ fontWeight: 400 }}>Il primo libro</h2>
          <p className="muted">Crea un libro e inizia a scrivere i suoi capitoli.</p>
          <button className="btn btn-primary" onClick={openModal}>+ Nuovo libro</button>
        </div>
      )}

      {books && books.length > 0 && (
        <div className="chapter-list">
          {books.map(b => (
            <Link key={b.id} to={`/libro/${b.id}`} className="chapter-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="chapter-name serif" style={{ fontWeight: 400, fontSize: 20 }}>{b.title}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {b.chapterCount} {b.chapterCount === 1 ? 'capitolo' : 'capitoli'} · {b.blockCount} mini-capitoli
                </div>
              </div>
              {b.blockCount > 0 && b.approvedCount === b.blockCount ? (
                <span className="badge badge-green">{b.approvedCount}/{b.blockCount} approvati</span>
              ) : b.blockCount > 0 ? (
                <span className="badge badge-gray">{b.approvedCount}/{b.blockCount} approvati</span>
              ) : (
                <span className="badge badge-gray">Vuoto</span>
              )}
            </Link>
          ))}
        </div>
      )}

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={add}>
            <h3>Nuovo libro</h3>
            <label className="label">Titolo</label>
            <input className="input" autoFocus value={title} placeholder="Il titolo del libro"
              onChange={e => { setTitle(e.target.value); setFormErr('') }} style={{ margin: '6px 0 14px' }} />

            <label className="label">Guida di stile di partenza</label>
            <div style={{ margin: '8px 0 14px' }}>
              <label className="row" style={{ marginBottom: 8, cursor: books?.length ? 'pointer' : 'default', opacity: books?.length ? 1 : 0.5 }}>
                <input type="radio" name="style" checked={styleFrom === 'copy'} disabled={!books?.length}
                  onChange={() => { setStyleFrom('copy'); setFormErr('') }} />
                Copia da un libro esistente
              </label>
              {styleFrom === 'copy' && books?.length > 0 && (
                <select className="input" value={sourceId} onChange={e => setSourceId(e.target.value)} style={{ marginBottom: 10 }}>
                  {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              )}
              <label className="row" style={{ cursor: 'pointer' }}>
                <input type="radio" name="style" checked={styleFrom === 'empty'} onChange={() => { setStyleFrom('empty'); setFormErr('') }} />
                Vuota
              </label>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>La memoria del libro parte sempre vuota.</p>

            {formErr && <p className="error">{formErr}</p>}
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn" onClick={() => setModal(false)}>Annulla</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creo…' : 'Crea'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
