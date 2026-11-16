import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { APP_NAME } from '../config'

const TABS = [
  { to: '/', label: 'Capitoli' },
  { to: '/memoria', label: 'Memoria del libro' },
  { to: '/esporta', label: 'Esporta' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const [logoOk, setLogoOk] = useState(true)
  const active = t => (t.to === '/' ? pathname === '/' || pathname.startsWith('/capitolo') : pathname.startsWith(t.to))
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
        <nav className="tabs">
          {TABS.map(t => (
            <Link key={t.to} to={t.to} className={`tab ${active(t) ? 'active' : ''}`}>
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
