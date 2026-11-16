import { useState } from 'react'
import { fmtDateTime } from '../lib/format'

const TYPE = { text: 'tastiera', voice: 'vocale', mixed: 'vocale + tastiera' }

export default function SessionItem({ session, index, blockCount = 0, onSaveText, onProcess, onDelete, disabled }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(session.original_text)

  const modified = session.processed_at && session.original_updated_at && session.original_updated_at > session.processed_at
  const status = !session.processed_at
    ? <span className="badge badge-gray">Non rielaborato</span>
    : modified
      ? <span className="badge badge-yellow">Originale modificato</span>
      : <span className="badge badge-green">Rielaborato</span>

  const save = async () => {
    if (draft.trim() === session.original_text) return setEditing(false)
    await onSaveText(session.id, draft.trim())
    setEditing(false)
  }

  return (
    <div className="session">
      <div className="session-meta">
        <span>#{index + 1} · {fmtDateTime(session.created_at)} · {TYPE[session.input_type] || session.input_type}</span>
        <span className="spacer" />
        {status}
      </div>
      {editing ? (
        <>
          <textarea className="textarea" rows={8} value={draft} onChange={e => setDraft(e.target.value)} />
          <div className="row" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-sm" onClick={() => { setDraft(session.original_text); setEditing(false) }}>Annulla</button>
            <button className="btn btn-sm btn-primary" onClick={save}>Salva originale</button>
          </div>
        </>
      ) : (
        <div className="session-text">{session.original_text}</div>
      )}
      {!editing && (
        <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setDraft(session.original_text); setEditing(true) }} disabled={disabled}>Modifica</button>
          {(!session.processed_at || modified || blockCount === 0) && (
            <button className="btn btn-sm btn-primary" onClick={() => onProcess(session)} disabled={disabled}>
              {modified ? 'Rielabora dalla mia versione' : 'Rielabora'}
            </button>
          )}
          <span className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(session)} disabled={disabled}>Elimina</button>
        </div>
      )}
    </div>
  )
}
