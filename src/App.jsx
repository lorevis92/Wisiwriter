import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Books from './pages/Books'
import Home from './pages/Home'
import Chapter from './pages/Chapter'
import Memory from './pages/Memory'
import Export from './pages/Export'
import PrintBook from './pages/PrintBook'
import { getChapter } from './lib/db'

// Vecchi link /capitolo/:id (prima dei libri) → nuovo percorso dentro il libro del capitolo
function LegacyChapter() {
  const { id } = useParams()
  const navigate = useNavigate()
  useEffect(() => {
    getChapter(id)
      .then(c => navigate(`/libro/${c.book_id}/capitolo/${c.id}`, { replace: true }))
      .catch(() => navigate('/', { replace: true }))
  }, [id, navigate])
  return <p className="muted">Caricamento…</p>
}

export default function App() {
  const { pathname } = useLocation()
  if (pathname === '/stampa') return <PrintBook />
  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Books />} />
          <Route path="/libro/:bookId" element={<Home />} />
          <Route path="/libro/:bookId/capitolo/:id" element={<Chapter />} />
          <Route path="/libro/:bookId/memoria" element={<Memory />} />
          <Route path="/libro/:bookId/esporta" element={<Export />} />
          <Route path="/capitolo/:id" element={<LegacyChapter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
