import { useEffect, useState } from 'react'
import { Link, useLocation, useMatch } from 'react-router-dom'
import { APP_NAME } from '../config'
import { getBook } from '../lib/db'
import { onBookChanged } from '../lib/bookEvents'

export default function Navbar() {
  const { pathname } = useLocation()
  const match = useMatch('/libro/:bookId/*')
  const bookId = match?.params.bookId
  const [logoOk, setLogoOk] = useState(true)
  const [book, setBook] = useState(null)

  useEffect(() => {
    if (!bookId) return setBook(null)
    let alive = true
    const load = () => getBook(bookId).then(b => alive && setBook(b)).catch(() => alive && setBook(null))
    load()
    const off = onBookChanged(id => id === bookId && load())
    return () => { alive = false; off() }
  }, [bookId])

  const base = bookId ? `/libro/${bookId}` : ''
  const tabs = bookId
    ? [
        { to: base, label: 'Capitoli' },
        { to: `${base}/memoria`, label: 'Memoria del libro' },
        { to: `${base}/esporta`, label: 'Esporta' },
      ]
    : []
  const active = t => (t.to === base ? pathname === base || pathname.startsWith(`${base}/capitolo`) : pathname.startsWith(t.to))

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand">
          {logoOk ? (
            <img src="/logo-wisiwriter.png" alt={APP_NAME} onError={() => setLogoOk(false)} />
          ) : (
            <span className="brand-name">{APP_NAME}</span>
          )}
        </Link>
        {bookId && (
          <div className="row" style={{ minWidth: 0 }}>
            <Link to="/" className="btn btn-ghost btn-sm">← Libri</Link>
            <span className="serif" style={{ fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {book?.title || ''}
            </span>
          </div>
        )}
        {tabs.length > 0 && (
          <nav className="tabs">
            {tabs.map(t => (
              <Link key={t.to} to={t.to} className={`tab ${active(t) ? 'active' : ''}`}>
                {t.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
