import { useEffect, useState } from 'react'
import { loadBook } from '../lib/db'
import { fmtDate, paragraphs } from '../lib/format'
import { BOOK_TITLE } from '../config'

export default function PrintBook() {
  const params = new URLSearchParams(window.location.search)
  const onlyApproved = params.get('approvati') !== '0'
  const withTitles = params.get('titoli') === '1'
  const [book, setBook] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadBook({ onlyApproved }).then(setBook).catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    if (book?.length) setTimeout(() => window.print(), 400)
  }, [book])

  if (error) return <p className="error print-book">{error}</p>
  if (!book) return <p className="muted print-book">Preparo il libro…</p>

  return (
    <div className="print-book">
      <div className="no-print" style={{ fontFamily: 'var(--syne)', marginBottom: 30, textAlign: 'center' }}>
        <button className="btn btn-primary" onClick={() => window.print()}>Stampa / salva PDF</button>
      </div>
      <h1>{BOOK_TITLE}</h1>
      {!book.length && <p>Nessun contenuto da esportare.</p>}
      {book.map(c => (
        <section key={c.id} className="print-chapter">
          <h2>{fmtDate(c.chapter_date)}</h2>
          {withTitles && <p style={{ textAlign: 'center', fontStyle: 'italic', marginTop: -20 }}>{c.title}</p>}
          {c.blocks.map(b => (
            <div key={b.id}>
              <h3>{b.title}</h3>
              {paragraphs(b.body).map((p, i) => <p key={i}>{p}</p>)}
              {b.closing_line && <p className="closing">{b.closing_line}</p>}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
