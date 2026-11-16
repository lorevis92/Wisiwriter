import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listChapters, createChapter } from '../lib/db'
import { fmtShortDate, today } from '../lib/format'
import { BOOK_TITLE } from '../config'

export default function Home() {
  const [chapters, setChapters] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today())
  const [formErr, setFormErr] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    listChapters().then(setChapters).catch(e => setError(e.message))
  }, [])

  const add = async e => {
    e.preventDefault()
    if (!title.trim()) return setFormErr('Dai un nome al capitolo.')
    try {
      const c = await createChapter(title.trim(), date)
      navigate(`/capitolo/${c.id}`)
    } catch (err) {
      setFormErr(err.message)
    }
  }

  const totals = chapters && {
    blocks: chapters.reduce((s, c) => s + c.blockCount, 0),
    approved: chapters.reduce((s, c) => s + c.approvedCount, 0),
  }

  return (
    <>
      <div className="home-head">
        <div>
          <h1 className="home-title">{BOOK_TITLE}</h1>
          {chapters && (
            <div className="muted">
              <span className="mono">{chapters.length}</span> capitoli · <span className="mono">{totals.blocks}</span> mini-capitoli ·{' '}
              <span className="mono">{totals.approved}</span> approvati
            </div>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => { setTitle(''); setDate(today()); setFormErr(''); setModal(true) }}>
          + Aggiungi capitolo
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {!chapters && !error && <p className="muted">Caricamento…</p>}

      {chapters && chapters.length === 0 && (
        <div className="card empty">
          <h2 className="serif" style={{ fontWeight: 400 }}>Il primo giorno</h2>
          <p className="muted">Crea il primo capitolo e inizia a scrivere, o a parlare.</p>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Aggiungi capitolo</button>
        </div>
      )}

      {chapters && chapters.length > 0 && (
        <div className="chapter-list">
          {chapters.map(c => (
            <Link key={c.id} to={`/capitolo/${c.id}`} className="chapter-row">
              <span className="chapter-date">{fmtShortDate(c.chapter_date)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="chapter-name">{c.title}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {c.sessionCount} {c.sessionCount === 1 ? 'sessione' : 'sessioni'} · {c.blockCount} mini-capitoli
                </div>
              </div>
              {c.reviewCount > 0 ? (
                <span className="badge badge-yellow">{c.reviewCount} da rivedere</span>
              ) : c.blockCount > 0 && c.approvedCount === c.blockCount ? (
                <span className="badge badge-green">Approvato</span>
              ) : c.blockCount > 0 ? (
                <span className="badge badge-gray">
                  {c.approvedCount}/{c.blockCount} approvati
                </span>
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
            <h3>Nuovo capitolo</h3>
            <label className="label">Nome</label>
            <input className="input" autoFocus value={title} placeholder="Il giorno che ho venduto troppo presto"
              onChange={e => { setTitle(e.target.value); setFormErr('') }} style={{ margin: '6px 0 14px' }} />
            <label className="label">Data</label>
            <input className="input mono" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ margin: '6px 0 14px' }} />
            {formErr && <p className="error">{formErr}</p>}
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn" onClick={() => setModal(false)}>Annulla</button>
              <button type="submit" className="btn btn-primary">Crea</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
