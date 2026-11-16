import { useState } from 'react'
import { loadBook } from '../lib/db'


export default function Export() {
  const [onlyApproved, setOnlyApproved] = useState(true)
  const [withTitles, setWithTitles] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const word = async () => {
    setBusy(true)
    setError('')
    try {
      const book = await loadBook({ onlyApproved })
      if (!book.length) throw new Error(onlyApproved ? 'Non ci sono ancora mini-capitoli approvati.' : 'Il libro è ancora vuoto.')
      const { exportDocx } = await import('../lib/exportDocx')
      await exportDocx(book, { withTitles })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const pdf = () => window.open(`/stampa?approvati=${onlyApproved ? 1 : 0}&titoli=${withTitles ? 1 : 0}`, '_blank')

  return (
    <>
      <div className="home-head">
        <div>
          <h1 className="home-title">Esporta il libro</h1>
          <div className="muted">Le date sono i titoli dei capitoli, dentro ci sono i mini-capitoli.</div>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <label className="row" style={{ marginBottom: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyApproved} onChange={e => setOnlyApproved(e.target.checked)} />
          Solo mini-capitoli approvati
        </label>
        <label className="row" style={{ marginBottom: 20, cursor: 'pointer' }}>
          <input type="checkbox" checked={withTitles} onChange={e => setWithTitles(e.target.checked)} />
          Mostra anche il mio nome del capitolo sotto la data
        </label>
        <div className="row">
          <button className="btn btn-primary" onClick={word} disabled={busy}>{busy ? 'Preparo…' : 'Scarica Word'}</button>
          <button className="btn" onClick={pdf}>PDF (stampa)</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </>
  )
}
