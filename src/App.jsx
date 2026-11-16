import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Chapter from './pages/Chapter'
import Memory from './pages/Memory'
import Export from './pages/Export'
import PrintBook from './pages/PrintBook'

export default function App() {
  const { pathname } = useLocation()
  if (pathname === '/stampa') return <PrintBook />
  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/capitolo/:id" element={<Chapter />} />
          <Route path="/memoria" element={<Memory />} />
          <Route path="/esporta" element={<Export />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
