import { useRef, useState } from 'react'
import { paragraphs } from '../lib/format'

// Evidenzia le citazioni delle note dentro un paragrafo
function highlight(text, quotes) {
  const ranges = []
  for (const q of quotes) {
    if (!q) continue
    const i = text.indexOf(q)
    if (i >= 0 && !ranges.some(r => i < r[1] && i + q.length > r[0])) ranges.push([i, i + q.length])
  }
  if (!ranges.length) return text
  ranges.sort((a, b) => a[0] - b[0])
  const out = []
  let pos = 0
  ranges.forEach(([s, e], k) => {
    if (s > pos) out.push(text.slice(pos, s))
    out.push(<mark key={k}>{text.slice(s, e)}</mark>)
    pos = e
  })
  if (pos < text.length) out.push(text.slice(pos))
  return out
}

export default function BlockCard({ block, index, total, disabled, actions }) {
  const bodyRef = useRef(null)
  const [pop, setPop] = useState(null) // { x, y, quote }
  const [draft, setDraft] = useState(null) // { quote, note }
  const [noteErr, setNoteErr] = useState('')
  const v = block.current
  const quotes = block.notes.map(n => n.quote).filter(Boolean)

  const onSelect = () => {
    const sel = window.getSelection()
    const quote = sel?.toString().trim()
    if (!quote || !bodyRef.current?.contains(sel.anchorNode)) return setPop(null)
    const r = sel.getRangeAt(0).getBoundingClientRect()
    setPop({ x: r.left + r.width / 2, y: r.top - 38, quote })
  }

  const openNote = quote => {
    setDraft({ quote, note: '' })
    setNoteErr('')
    setPop(null)
    window.getSelection()?.removeAllRanges()
  }

  const saveNote = async () => {
    if (!draft.note.trim()) return setNoteErr('Scrivi cosa vuoi che l’AI cambi.')
    await actions.addNote(block.id, draft.quote, draft.note.trim())
    setDraft(null)
  }

  const cls = `block ${block.status === 'approved' ? 'approved' : ''} ${block.needs_review ? 'review' : ''}`

  return (
    <div className={cls}>
      {block.needs_review && (
        <div className="review-banner">
          <span style={{ flex: 1 }}>{block.review_reason || 'Da rivedere'}</span>
          <button className="btn btn-sm" onClick={() => actions.keep(block)} disabled={disabled}>Tieni</button>
          <button className="btn btn-sm" onClick={() => actions.remove(block)} disabled={disabled}>Elimina</button>
        </div>
      )}

      <div className="block-head">
        <span className="mono muted" style={{ fontSize: 12, paddingTop: 6 }}>{index + 1}</span>
        <h2 className="block-title">{v.title}</h2>
        {block.status === 'approved' ? (
          <span className="badge badge-green">Approvato</span>
        ) : (
          <span className="badge badge-gray mono">v{block.versions.findIndex(x => x.id === v.id) + 1} di {block.versions.length}</span>
        )}
      </div>

      <div className="block-body" ref={bodyRef} onMouseUp={onSelect} onTouchEnd={() => setTimeout(onSelect, 50)}>
        {paragraphs(v.body).map((p, i) => (
          <p key={i}>{highlight(p, quotes)}</p>
        ))}
      </div>
      {v.closing_line && <p className="block-closing">{v.closing_line}</p>}

      {block.notes.map(n => (
        <div key={n.id} className="note">
          <div style={{ flex: 1 }}>
            {n.quote ? <><q>{n.quote.length > 90 ? n.quote.slice(0, 90) + '…' : n.quote}</q> — </> : <strong>Nota generale — </strong>}
            {n.note}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => actions.deleteNote(n.id)} aria-label="Elimina nota">✕</button>
        </div>
      ))}

      {draft && (
        <div style={{ marginTop: 10 }}>
          {draft.quote && <div className="note"><q>{draft.quote}</q></div>}
          <textarea
            className="textarea"
            rows={2}
            style={{ minHeight: 60, marginTop: 6 }}
            autoFocus
            placeholder="Qui sono stato vago, inventa tu il prezzo. Oppure: taglia, più autoironico, espandi…"
            value={draft.note}
            onChange={e => { setDraft({ ...draft, note: e.target.value }); setNoteErr('') }}
          />
          {noteErr && <p className="error">{noteErr}</p>}
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
            <button className="btn btn-sm" onClick={() => setDraft(null)}>Annulla</button>
            <button className="btn btn-sm btn-primary" onClick={saveNote}>Salva nota</button>
          </div>
        </div>
      )}

      <div className="block-actions">
        {block.notes.length > 0 && (
          <button className="btn btn-sm btn-primary" onClick={() => actions.revise(block)} disabled={disabled}>
            Applica note ({block.notes.length})
          </button>
        )}
        {block.status === 'approved' ? (
          <button className="btn btn-sm" onClick={() => actions.unapprove(block)} disabled={disabled}>Riapri</button>
        ) : (
          <button className="btn btn-sm btn-green" onClick={() => actions.approve(block)} disabled={disabled}>✓ Approva</button>
        )}
        <button className="btn btn-sm" onClick={() => openNote('')} disabled={disabled}>+ Nota</button>
        <button className="btn btn-sm" onClick={() => actions.edit(block)} disabled={disabled}>Modifica</button>
        {block.versions.length > 1 && (
          <button className="btn btn-sm" onClick={() => actions.versions(block)} disabled={disabled}>Versioni ({block.versions.length})</button>
        )}
        <span className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={() => actions.move(block, -1)} disabled={disabled || index === 0} aria-label="Sposta su">↑</button>
        <button className="btn btn-ghost btn-sm" onClick={() => actions.move(block, 1)} disabled={disabled || index === total - 1} aria-label="Sposta giù">↓</button>
        <button className="btn btn-ghost btn-sm" onClick={() => actions.remove(block)} disabled={disabled}>Elimina</button>
      </div>

      {pop && (
        <button className="sel-pop" style={{ left: pop.x, top: pop.y, transform: 'translateX(-50%)' }}
          onMouseDown={e => e.preventDefault()} onClick={() => openNote(pop.quote)}>
          + Nota per l'AI
        </button>
      )}
    </div>
  )
}
