import { useState } from 'react'

export default function Footer() {
  const [logoOk, setLogoOk] = useState(true)
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-left">
          {logoOk && <img src="/logo-wisiverse.png" alt="WiSiVERSE" onError={() => setLogoOk(false)} />}
          <span>Part of the WiSiVERSE ecosystem</span>
        </div>
        <a className="footer-link" href="https://wisiverse.com" target="_blank" rel="noreferrer">
          wisiverse.com →
        </a>
      </div>
    </footer>
  )
}
