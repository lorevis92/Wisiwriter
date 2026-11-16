import { supabase } from './supabase'

const must = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

// ---------- Libri ----------
export async function listBooks() {
  const [books, chapters, blocks] = await Promise.all([
    supabase.from('wisiwriter_books').select('*').order('created_at').then(must),
    supabase.from('wisiwriter_chapters').select('id, book_id').then(must),
    supabase.from('wisiwriter_blocks').select('id, chapter_id, status').then(must),
  ])
  return books.map(book => {
    const chapterIds = new Set(chapters.filter(c => c.book_id === book.id).map(c => c.id))
    const bs = blocks.filter(b => chapterIds.has(b.chapter_id))
    return {
      ...book,
      chapterCount: chapterIds.size,
      blockCount: bs.length,
      approvedCount: bs.filter(b => b.status === 'approved').length,
    }
  })
}

export const getBook = id => supabase.from('wisiwriter_books').select('*').eq('id', id).single().then(must)
export const createBook = ({ title, style_guide = '' }) =>
  supabase.from('wisiwriter_books').insert({ title, style_guide, memory: '' }).select().single().then(must)
export const updateBook = (id, patch) =>
  supabase.from('wisiwriter_books').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).then(must)

// Aggiunge righe alla memoria del libro
export async function appendMemory(bookId, lines) {
  if (!lines?.length) return
  const book = await getBook(bookId)
  const add = lines.map(l => `- ${l}`).join('\n')
  await updateBook(bookId, { memory: book.memory ? `${book.memory.trimEnd()}\n${add}` : add })
}

// ---------- Capitoli ----------
export async function listChapters(bookId) {
  const chapters = await supabase
    .from('wisiwriter_chapters')
    .select('*')
    .eq('book_id', bookId)
    .order('chapter_date', { ascending: false })
    .order('created_at', { ascending: false })
    .then(must)
  const ids = chapters.map(c => c.id)
  const [sessions, blocks] = ids.length
    ? await Promise.all([
        supabase.from('wisiwriter_sessions').select('id, chapter_id').in('chapter_id', ids).then(must),
        supabase.from('wisiwriter_blocks').select('id, chapter_id, status, needs_review').in('chapter_id', ids).then(must),
      ])
    : [[], []]
  return chapters.map(c => {
    const bs = blocks.filter(b => b.chapter_id === c.id)
    return {
      ...c,
      sessionCount: sessions.filter(s => s.chapter_id === c.id).length,
      blockCount: bs.length,
      approvedCount: bs.filter(b => b.status === 'approved').length,
      reviewCount: bs.filter(b => b.needs_review).length,
    }
  })
}

export const getChapter = id => supabase.from('wisiwriter_chapters').select('*').eq('id', id).single().then(must)
export const createChapter = (book_id, title, chapter_date) =>
  supabase.from('wisiwriter_chapters').insert({ book_id, title, chapter_date }).select().single().then(must)
export const updateChapter = (id, patch) =>
  supabase.from('wisiwriter_chapters').update(patch).eq('id', id).then(must)
export const deleteChapter = id => supabase.from('wisiwriter_chapters').delete().eq('id', id).then(must)

// ---------- Capitolo completo ----------
export async function loadChapter(id) {
  const [chapter, sessions, blocks, suggestions] = await Promise.all([
    supabase.from('wisiwriter_chapters').select('*').eq('id', id).single().then(must),
    supabase.from('wisiwriter_sessions').select('*').eq('chapter_id', id).order('created_at').then(must),
    supabase.from('wisiwriter_blocks').select('*').eq('chapter_id', id).order('position').then(must),
    supabase.from('wisiwriter_suggestions').select('*').eq('chapter_id', id).eq('status', 'open').order('created_at').then(must),
  ])
  const ids = blocks.map(b => b.id)
  const [versions, notes] = ids.length
    ? await Promise.all([
        supabase.from('wisiwriter_block_versions').select('*').in('block_id', ids).order('created_at').then(must),
        supabase.from('wisiwriter_block_notes').select('*').in('block_id', ids).eq('resolved', false).order('created_at').then(must),
      ])
    : [[], []]
  const full = blocks.map(b => {
    const vs = versions.filter(v => v.block_id === b.id)
    const current = vs.find(v => v.id === b.current_version_id) || vs[vs.length - 1] || { title: '', body: '', closing_line: '' }
    return { ...b, versions: vs, current, notes: notes.filter(n => n.block_id === b.id) }
  })
  return { chapter, sessions, blocks: full, suggestions }
}

// ---------- Sessioni (originali) ----------
export const createSession = (chapter_id, original_text, input_type) =>
  supabase.from('wisiwriter_sessions').insert({ chapter_id, original_text, input_type }).select().single().then(must)
export const updateSessionText = (id, original_text) =>
  supabase.from('wisiwriter_sessions').update({ original_text, original_updated_at: new Date().toISOString() }).eq('id', id).then(must)
export const markSessionProcessed = id =>
  supabase.from('wisiwriter_sessions').update({ processed_at: new Date().toISOString() }).eq('id', id).then(must)
export const deleteSession = id => supabase.from('wisiwriter_sessions').delete().eq('id', id).then(must)

// ---------- Blocchi e versioni ----------
export async function createBlock(chapter_id, session_id, position, content, source = 'ai') {
  const block = await supabase.from('wisiwriter_blocks').insert({ chapter_id, session_id, position }).select().single().then(must)
  await addVersion(block.id, content, source)
  return block
}

export async function addVersion(block_id, { title, body, closing_line }, source) {
  const v = await supabase
    .from('wisiwriter_block_versions')
    .insert({ block_id, title: title || '', body: body || '', closing_line: closing_line || '', source })
    .select()
    .single()
    .then(must)
  await supabase.from('wisiwriter_blocks').update({ current_version_id: v.id, status: 'draft', needs_review: false, review_reason: null }).eq('id', block_id).then(must)
  await supabase.from('wisiwriter_block_translations').update({ stale: true }).eq('block_id', block_id).then(must)
  return v
}

export async function approveBlock(block) {
  await supabase.from('wisiwriter_blocks').update({ status: 'approved', needs_review: false, review_reason: null }).eq('id', block.id).then(must)
  await supabase.from('wisiwriter_block_versions').delete().eq('block_id', block.id).neq('id', block.current_version_id).then(must)
}

export const unapproveBlock = id => supabase.from('wisiwriter_blocks').update({ status: 'draft' }).eq('id', id).then(must)

export const restoreVersion = (block_id, version_id) =>
  supabase.from('wisiwriter_blocks').update({ current_version_id: version_id, status: 'draft' }).eq('id', block_id).then(must)

export const flagBlock = (id, reason) =>
  supabase.from('wisiwriter_blocks').update({ needs_review: true, review_reason: reason }).eq('id', id).then(must)
export const clearFlag = id =>
  supabase.from('wisiwriter_blocks').update({ needs_review: false, review_reason: null }).eq('id', id).then(must)

export const deleteBlock = id => supabase.from('wisiwriter_blocks').delete().eq('id', id).then(must)
export const setBlockPosition = (id, position) => supabase.from('wisiwriter_blocks').update({ position }).eq('id', id).then(must)

// ---------- Note ----------
export const addNote = (block_id, quote, note) =>
  supabase.from('wisiwriter_block_notes').insert({ block_id, quote, note }).select().single().then(must)
export const deleteNote = id => supabase.from('wisiwriter_block_notes').delete().eq('id', id).then(must)
export const resolveNotes = ids => supabase.from('wisiwriter_block_notes').update({ resolved: true }).in('id', ids).then(must)

// ---------- Suggerimenti ----------
export const insertSuggestions = rows => (rows.length ? supabase.from('wisiwriter_suggestions').insert(rows).then(must) : null)
export const setSuggestionStatus = (id, status) => supabase.from('wisiwriter_suggestions').update({ status }).eq('id', id).then(must)

// ---------- Export ----------
// Restituisce { book, chapters } con i capitoli del libro (in ordine) e le versioni correnti dei blocchi
export async function loadBook({ bookId, onlyApproved }) {
  const [book, chapters] = await Promise.all([
    getBook(bookId),
    supabase.from('wisiwriter_chapters').select('*').eq('book_id', bookId).order('chapter_date').order('created_at').then(must),
  ])
  const chapterIds = chapters.map(c => c.id)
  let blocks = []
  if (chapterIds.length) {
    let q = supabase.from('wisiwriter_blocks').select('*').in('chapter_id', chapterIds).order('position')
    if (onlyApproved) q = q.eq('status', 'approved')
    blocks = await q.then(must)
  }
  const vids = blocks.map(b => b.current_version_id).filter(Boolean)
  const versions = vids.length ? await supabase.from('wisiwriter_block_versions').select('*').in('id', vids).then(must) : []
  return {
    book,
    chapters: chapters
      .map(c => ({
        ...c,
        blocks: blocks
          .filter(b => b.chapter_id === c.id)
          .map(b => versions.find(v => v.id === b.current_version_id))
          .filter(Boolean),
      }))
      .filter(c => c.blocks.length),
  }
}
