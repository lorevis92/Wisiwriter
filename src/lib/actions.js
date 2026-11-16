import * as db from './db'
import { aiProcess, aiRevise, aiMerge } from './ai'

// Contesto comune per tutte le chiamate AI
async function buildContext(chapterId) {
  const data = await db.loadChapter(chapterId)
  const ch = data.chapter
  const [book, chapters] = await Promise.all([db.getBook(ch.book_id), db.listChapters(ch.book_id)])
  const previousChapters = chapters
    .filter(c => c.id !== ch.id && (c.chapter_date < ch.chapter_date || (c.chapter_date === ch.chapter_date && c.created_at < ch.created_at)))
    .sort((a, b) => (a.chapter_date + a.created_at).localeCompare(b.chapter_date + b.created_at))
    .map(c => ({ date: c.chapter_date, title: c.title, summary: c.summary }))
  const blocks = data.blocks.map(b => ({
    id: b.id,
    session_id: b.session_id,
    status: b.status,
    title: b.current.title,
    body: b.current.body,
    closing_line: b.current.closing_line,
  }))
  return {
    data,
    payload: {
      bookTitle: book.title,
      styleGuide: book.style_guide,
      bookMemory: book.memory,
      previousChapters,
      chapter: { title: ch.title, date: ch.chapter_date, summary: ch.summary },
      blocks,
    },
  }
}

function suggestionRows(chapterId, suggestions, memoryAdditions, resolveId) {
  const rows = []
  for (const s of suggestions || []) {
    if (!['merge', 'move', 'note'].includes(s.kind) || !s.text) continue
    const ids = (s.block_ids || []).map(resolveId).filter(Boolean)
    if (s.kind !== 'note' && !ids.length) continue
    rows.push({ chapter_id: chapterId, kind: s.kind, text: s.text, block_ids: ids, payload: { new_position: s.new_position ?? null } })
  }
  for (const m of memoryAdditions || []) {
    if (m && m.trim()) rows.push({ chapter_id: chapterId, kind: 'memory', text: m.trim(), block_ids: [], payload: {} })
  }
  return rows
}

// Nuova sessione → nuovi blocchi
export async function processSession(chapterId, sessionId) {
  const { data, payload } = await buildContext(chapterId)
  const session = data.sessions.find(s => s.id === sessionId)
  const out = await aiProcess({ ...payload, mode: 'new', sessionText: session.original_text })

  let pos = data.blocks.length ? Math.max(...data.blocks.map(b => b.position)) + 1 : 1
  const newIds = []
  for (const blk of out.blocks) {
    const created = await db.createBlock(chapterId, sessionId, pos++, blk, 'ai')
    newIds.push(created.id)
  }
  const validIds = new Set([...data.blocks.map(b => b.id), ...newIds])
  const resolveId = ref => {
    if (typeof ref === 'string' && ref.startsWith('new:')) return newIds[Number(ref.slice(4))]
    return validIds.has(ref) ? ref : null
  }
  await db.insertSuggestions(suggestionRows(chapterId, out.suggestions, out.memory_additions, resolveId))
  if (out.chapter_summary) await db.updateChapter(chapterId, { summary: out.chapter_summary })
  await db.markSessionProcessed(sessionId)
}

// Originale modificato → aggiorna i blocchi di quella sessione
export async function reprocessSession(chapterId, sessionId) {
  const { data, payload } = await buildContext(chapterId)
  const session = data.sessions.find(s => s.id === sessionId)
  const sessionBlocks = data.blocks.filter(b => b.session_id === sessionId)
  if (!sessionBlocks.length) return processSession(chapterId, sessionId)

  const out = await aiProcess({
    ...payload,
    mode: 'reprocess',
    sessionText: session.original_text,
    sessionBlockIds: sessionBlocks.map(b => b.id),
  })

  const byId = new Map(sessionBlocks.map(b => [b.id, b]))
  const replaced = new Set()
  const newIds = []
  let lastPos = Math.max(...sessionBlocks.map(b => b.position))
  const nextAfter = data.blocks.find(b => b.position > lastPos)
  const gap = nextAfter ? (nextAfter.position - lastPos) / (out.blocks.length + 1) : 1

  for (const blk of out.blocks) {
    const old = blk.replaces && byId.get(blk.replaces)
    if (old && !replaced.has(old.id)) {
      replaced.add(old.id)
      const same =
        old.current.title === blk.title && old.current.body === blk.body && old.current.closing_line === blk.closing_line
      if (!same) await db.addVersion(old.id, blk, 'reprocess')
      newIds.push(old.id)
    } else {
      lastPos += gap
      const created = await db.createBlock(chapterId, sessionId, lastPos, blk, 'reprocess')
      newIds.push(created.id)
    }
  }
  for (const b of sessionBlocks) {
    if (!replaced.has(b.id)) await db.flagBlock(b.id, "Non corrisponde più all'originale modificato: tienilo o eliminalo.")
  }
  const validIds = new Set([...data.blocks.map(b => b.id), ...newIds])
  const resolveId = ref => {
    if (typeof ref === 'string' && ref.startsWith('new:')) return newIds[Number(ref.slice(4))]
    return validIds.has(ref) ? ref : null
  }
  await db.insertSuggestions(suggestionRows(chapterId, out.suggestions, out.memory_additions, resolveId))
  if (out.chapter_summary) await db.updateChapter(chapterId, { summary: out.chapter_summary })
  await db.markSessionProcessed(sessionId)
}

// Applica le note di un blocco
export async function reviseBlock(chapterId, blockId) {
  const { data, payload } = await buildContext(chapterId)
  const block = data.blocks.find(b => b.id === blockId)
  const session = data.sessions.find(s => s.id === block.session_id)
  const out = await aiRevise({
    ...payload,
    block: { id: block.id, ...block.current },
    notes: block.notes.map(n => ({ quote: n.quote, note: n.note })),
    originalText: session?.original_text,
  })
  await db.addVersion(blockId, out, 'notes')
  await db.resolveNotes(block.notes.map(n => n.id))
  await db.insertSuggestions(suggestionRows(chapterId, [], out.memory_additions, () => null))
}

// Applica un suggerimento dell'AI
export async function applySuggestion(chapterId, s) {
  if (s.kind === 'memory') {
    const chapter = await db.getChapter(chapterId)
    await db.appendMemory(chapter.book_id, [s.text])
  } else if (s.kind === 'merge') {
    const { data, payload } = await buildContext(chapterId)
    const blocks = s.block_ids.map(id => data.blocks.find(b => b.id === id)).filter(Boolean).sort((a, b) => a.position - b.position)
    if (blocks.length >= 2) {
      const out = await aiMerge({
        bookTitle: payload.bookTitle,
        styleGuide: payload.styleGuide,
        bookMemory: payload.bookMemory,
        blocks: blocks.map(b => b.current),
        hint: s.text,
      })
      await db.addVersion(blocks[0].id, out, 'merge')
      for (const b of blocks.slice(1)) await db.deleteBlock(b.id)
    }
  } else if (s.kind === 'move') {
    const data = await db.loadChapter(chapterId)
    const target = data.blocks.find(b => b.id === s.block_ids[0])
    const others = data.blocks.filter(b => b.id !== target?.id)
    const idx = Math.max(0, Math.min(others.length, (s.payload?.new_position || 1) - 1))
    if (target) {
      const before = others[idx - 1]?.position ?? (others[0] ? others[0].position - 1 : 0)
      const after = others[idx]?.position ?? before + 2
      await db.setBlockPosition(target.id, (before + after) / 2)
    }
  } else if (s.kind === 'note') {
    const target = s.block_ids[0]
    if (target) await db.addNote(target, '', s.text)
  }
  await db.setSuggestionStatus(s.id, 'applied')
}
