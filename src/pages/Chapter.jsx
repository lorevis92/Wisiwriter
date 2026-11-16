import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as db from '../lib/db'
import * as act from '../lib/actions'
import { fmtDate } from '../lib/format'
import Composer from '../components/Composer'
import SessionItem from '../components/SessionItem'
import BlockCard from '../components/BlockCard'
import { EditBlockModal, VersionsModal } from '../components/Modals'
import Busy from '../components/Busy'

const KIND = { merge: 'Unire', move: 'Spostare', note: 'Osservazione' }

export default function Chapter() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [editing, setEditing] = useState(null)
  const [versions, setVersions] = useState(null)
  const [view, setView] = useState('book')
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const [showSummary, setShowSummary] = useState(false)

  const reload = useCallback(() => db.loadChapter(id).then(setData).catch(e => setError(e.message)), [id])
  useEffect(() => { reload() }, [reload])

  // esegue un'azione con messaggio di attesa, gestione errori e ricarica
  const run = async (msg, fn) => {
    setBusy(msg)
    setError('')
    try {
      await fn()
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      await reload()
      setBusy('')
    }
  }

  if (!data) return <p className={error ? 'error' : 'muted'}>{error || 'Caricamento…'}</p>
  const { chapter, sessions, blocks, suggestions } = data
  const structural = suggestions.filter(s => s.kind !== 'memory')
  const memorySugg = suggestions.filter(s => s.kind === 'memory')
  const blockNum = bid => blocks.findIndex(b => b.id === bid) + 1

  // Prima salva l'originale (così non si perde mai), poi eventualmente rielabora
  const onSaveSession = async (text, type, process) => {
    let s
    try {
      s = await db.createSession(chapter.id, text, type)
    } catch (e) {
      setError(e.message)
      return false
    }
    if (process) {
      setView('book')
      run('L’AI sta rielaborando…', () => act.processSession(chapter.id, s.id))
    } else {
      reload()
    }
    return true
  }

  const onProcess = s =>
    run('L’AI sta rielaborando…', () =>
      s.processed_at ? act.reprocessSession(chapter.id, s.id) : act.processSession(chapter.id, s.id)
    )

  const onDeleteSession = s => {
    const n = blocks.filter(b => b.session_id === s.id).length
    if (!window.confirm(`Eliminare questo originale?${n ? ` I ${n} mini-capitoli nati da qui restano.` : ''}`)) return
    run('Elimino…', () => db.deleteSession(s.id))
  }

  const actions = {
    approve: b => run('Approvo…', () => db.approveBlock(b)),
    unapprove: b => run('Riapro…', () => db.unapproveBlock(b.id)),
    keep: b => run('Salvo…', () => db.clearFlag(b.id)),
    remove: b => window.confirm(`Eliminare "${b.current.title}"?`) && run('Elimino…', () => db.deleteBlock(b.id)),
    addNote: (bid, quote, note) => run('Salvo la nota…', () => db.addNote(bid, quote, note)),
    deleteNote: nid => run('Elimino la nota…', () => db.deleteNote(nid)),
    revise: b => run('L’AI applica le tue note…', () => act.reviseBlock(chapter.id, b.id)),
    edit: b => setEditing(b),
    versions: b => setVersions(b),
    move: (b, dir) => {
      const i = blocks.findIndex(x => x.id === b.id)
      const other = blocks[i + dir]
      if (!other) return
      run('Sposto…', async () => {
        await db.setBlockPosition(b.id, other.position)
        await db.setBlockPosition(other.id, b.position)
      })
    },
  }

  const rename = async () => {
    if (name.trim() && name.trim() !== chapter.title) await run('Salvo…', () => db.updateChapter(chapter.id, { title: name.trim() }))
    setRenaming(false)
  }

  const removeChapter = async () => {
    if (!window.confirm(`Eliminare il capitolo "${chapter.title}" con tutti gli originali e i mini-capitoli?`)) return
    await db.deleteChapter(chapter.id)
    navigate('/')
  }

  return (
    <>
      <div className="chapter-head">
        <Link to="/" className="btn btn-ghost">← Capitoli</Link>
        {renaming ? (
          <input className="input serif" style={{ maxWidth: 480, fontSize: 20 }} autoFocus value={name}
            onChange={e => setName(e.target.value)} onBlur={rename} onKeyDown={e => e.key === 'Enter' && rename()} />
        ) : (
          <h1 onClick={() => { setName(chapter.title); setRenaming(true) }} title="Clicca per rinominare" style={{ cursor: 'text' }}>
            {chapter.title}
          </h1>
        )}
        <span className="mono muted" style={{ fontSize: 13 }}>{fmtDate(chapter.chapter_date)}</span>
        <span className="spacer" />
        {chapter.summary && <button className="btn btn-ghost btn-sm" onClick={() => setShowSummary(!showSummary)}>{showSummary ? 'Nascondi riassunto' : 'Riassunto'}</button>}
        <button className="btn btn-ghost btn-sm" onClick={removeChapter}>Elimina capitolo</button>
      </div>
      {showSummary && <div className="card serif muted" style={{ marginBottom: 20, padding: 16 }}>{chapter.summary}</div>}
      {error && <p className="error" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="mobile-switch tabs" style={{ marginLeft: 0 }}>
        <button className={`tab ${view === 'original' ? 'active' : ''}`} style={{ border: 'none', flex: 1 }} onClick={() => setView('original')}>Il tuo originale</button>
        <button className={`tab ${view === 'book' ? 'active' : ''}`} style={{ border: 'none', flex: 1 }} onClick={() => setView('book')}>Versione AI</button>
      </div>

      <div className="split" data-view={view}>
        <section className="col-original">
          <div className="label" style={{ marginBottom: 10 }}>Il tuo originale</div>
          {sessions.length === 0 && <p className="muted" style={{ fontSize: 14 }}>Ancora niente. Scrivi qui sotto o registra.</p>}
          {sessions.map((s, i) => (
            <SessionItem key={s.id + (s.original_updated_at || '')} session={s} index={i} disabled={!!busy}
              onSaveText={(sid, text) => run('Salvo l’originale…', () => db.updateSessionText(sid, text))}
              onProcess={onProcess} onDelete={onDeleteSession} />
          ))}
          <Composer onSave={onSaveSession} disabled={!!busy} />
        </section>

        <section className="col-book">
          {structural.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="label" style={{ marginBottom: 8 }}>Suggerimenti dell'AI</div>
              {structural.map(s => (
                <div key={s.id} className="sugg">
                  <div style={{ marginBottom: 8 }}>
                    <strong>{KIND[s.kind]}</strong>
                    {s.block_ids.length > 0 && <span className="mono muted"> · blocchi {s.block_ids.map(blockNum).filter(n => n > 0).join(', ')}</span>}
                    {' — '}{s.text}
                  </div>
                  <div className="row">
                    <button className="btn btn-sm btn-primary" disabled={!!busy}
                      onClick={() => run(s.kind === 'merge' ? 'L’AI unisce i blocchi…' : 'Applico…', () => act.applySuggestion(chapter.id, s))}>
                      {s.kind === 'note' ? 'Aggiungi come nota' : 'Applica'}
                    </button>
                    <button className="btn btn-sm btn-ghost" disabled={!!busy} onClick={() => run('…', () => db.setSuggestionStatus(s.id, 'dismissed'))}>Ignora</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {memorySugg.length > 0 && (
            <div className="sugg memory">
              <div className="label" style={{ marginBottom: 8 }}>Da aggiungere alla memoria del libro</div>
              {memorySugg.map(s => (
                <div key={s.id} className="row" style={{ padding: '4px 0', alignItems: 'flex-start' }}>
                  <span style={{ flex: 1 }}>{s.text}</span>
                  <button className="btn btn-sm" disabled={!!busy} onClick={() => run('Aggiungo…', () => act.applySuggestion(chapter.id, s))}>Aggiungi</button>
                  <button className="btn btn-sm btn-ghost" disabled={!!busy} onClick={() => run('…', () => db.setSuggestionStatus(s.id, 'dismissed'))}>✕</button>
                </div>
              ))}
              {memorySugg.length > 1 && (
                <button className="btn btn-sm" style={{ marginTop: 8 }} disabled={!!busy}
                  onClick={() => run('Aggiungo…', async () => { for (const s of memorySugg) await act.applySuggestion(chapter.id, s) })}>
                  Aggiungi tutti
                </button>
              )}
            </div>
          )}

          {blocks.length === 0 ? (
            <div className="card empty">
              <h2 className="serif" style={{ fontWeight: 400 }}>Qui nasce il capitolo</h2>
              <p className="muted">Scrivi o registra la tua giornata a sinistra, poi premi "Salva e rielabora". L'AI la divide in mini-capitoli con titolo e frase finale.</p>
            </div>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Seleziona una frase per lasciare una nota all'AI.</p>
              {blocks.map((b, i) => (
                <BlockCard key={b.id + b.current_version_id + b.status} block={b} index={i} total={blocks.length} disabled={!!busy} actions={actions} />
              ))}
            </>
          )}
        </section>
      </div>

      {editing && (
        <EditBlockModal block={editing} onClose={() => setEditing(null)}
          onSave={content => { setEditing(null); run('Salvo…', () => db.addVersion(editing.id, content, 'manual')) }} />
      )}
      {versions && (
        <VersionsModal block={versions} onClose={() => setVersions(null)}
          onRestore={v => { setVersions(null); run('Ripristino…', () => db.restoreVersion(versions.id, v.id)) }} />
      )}
      <Busy text={busy} />
    </>
  )
}
