import { supabase } from './supabase'
import { DEFAULT_STYLE_GUIDE } from '../config'

const must = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

// ---------- Capitoli ----------
export async function listChapters() {
  const [chapters, sessions, blocks] = await Promise.all([
    supabase.from('chapters').select('*').order('chapter_date', { ascending: false }).order('created_at', { ascending: false }).then(must),
    supabase.from('sessions').select('id, chapter_id').then(must),
    supabase.from('blocks').select('id, chapter_id, status, needs_review').then(must),
  ])
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

export const createChapter = (title, chapter_date) =>
  supabase.from('chapters').insert({ title, chapter_date }).select().single().then(must)
export const updateChapter = (id, patch) =>
  supabase.from('chapters').update(patch).eq('id', id).then(must)
export const deleteChapter = id => supabase.from('chapters').delete().eq('id', id).then(must)

// ---------- Memoria del libro ----------
export async function getMemory() {
  const row = await supabase.from('book_memory').select('*').eq('id', 1).maybeSingle().then(must)
  if (row) return row
  return supabase.from('book_memory').insert({ id: 1, style_guide: DEFAULT_STYLE_GUIDE, memory: '' }).select().single().then(must)
}
export const saveMemory = patch =>
  supabase.from('book_memory').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1).then(must)

export async function appendMemory(lines) {
  if (!lines?.length) return
  const m = await getMemory()
  const add = lines.map(l => `- ${l}`).join('\n')
  await saveMemory({ memory: m.memory ? `${m.memory.trimEnd()}\n${add}` : add })
}

// ---------- Capitolo completo ----------
export async function loadChapter(id) {
  const [chapter, sessions, blocks, suggestions] = await Promise.all([
    supabase.from('chapters').select('*').eq('id', id).single().then(must),
    supabase.from('sessions').select('*').eq('chapter_id', id).order('created_at').then(must),
    supabase.from('blocks').select('*').eq('chapter_id', id).order('position').then(must),
    supabase.from('suggestions').select('*').eq('chapter_id', id).eq('status', 'open').order('created_at').then(must),
  ])
  const ids = blocks.map(b => b.id)
  const [versions, notes] = ids.length
    ? await Promise.all([
        supabase.from('block_versions').select('*').in('block_id', ids).order('created_at').then(must),
        supabase.from('block_notes').select('*').in('block_id', ids).eq('resolved', false).order('created_at').then(must),
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
  supabase.from('sessions').insert({ chapter_id, original_text, input_type }).select().single().then(must)
export const updateSessionText = (id, original_text) =>
  supabase.from('sessions').update({ original_text, original_updated_at: new Date().toISOString() }).eq('id', id).then(must)
export const markSessionProcessed = id =>
  supabase.from('sessions').update({ processed_at: new Date().toISOString() }).eq('id', id).then(must)
export const deleteSession = id => supabase.from('sessions').delete().eq('id', id).then(must)

// ---------- Blocchi e versioni ----------
export async function createBlock(chapter_id, session_id, position, content, source = 'ai') {
  const block = await supabase.from('blocks').insert({ chapter_id, session_id, position }).select().single().then(must)
  await addVersion(block.id, content, source)
  return block
}

export async function addVersion(block_id, { title, body, closing_line }, source) {
  const v = await supabase
    .from('block_versions')
    .insert({ block_id, title: title || '', body: body || '', closing_line: closing_line || '', source })
    .select()
    .single()
    .then(must)
  await supabase.from('blocks').update({ current_version_id: v.id, status: 'draft', needs_review: false, review_reason: null }).eq('id', block_id).then(must)
  await supabase.from('block_translations').update({ stale: true }).eq('block_id', block_id).then(must)
  return v
}

export async function approveBlock(block) {
  await supabase.from('blocks').update({ status: 'approved', needs_review: false, review_reason: null }).eq('id', block.id).then(must)
  await supabase.from('block_versions').delete().eq('block_id', block.id).neq('id', block.current_version_id).then(must)
}

export const unapproveBlock = id => supabase.from('blocks').update({ status: 'draft' }).eq('id', id).then(must)

export const restoreVersion = (block_id, version_id) =>
  supabase.from('blocks').update({ current_version_id: version_id, status: 'draft' }).eq('id', block_id).then(must)

export const flagBlock = (id, reason) =>
  supabase.from('blocks').update({ needs_review: true, review_reason: reason }).eq('id', id).then(must)
export const clearFlag = id =>
  supabase.from('blocks').update({ needs_review: false, review_reason: null }).eq('id', id).then(must)

export const deleteBlock = id => supabase.from('blocks').delete().eq('id', id).then(must)
export const setBlockPosition = (id, position) => supabase.from('blocks').update({ position }).eq('id', id).then(must)

// ---------- Note ----------
export const addNote = (block_id, quote, note) =>
  supabase.from('block_notes').insert({ block_id, quote, note }).select().single().then(must)
export const deleteNote = id => supabase.from('block_notes').delete().eq('id', id).then(must)
export const resolveNotes = ids => supabase.from('block_notes').update({ resolved: true }).in('id', ids).then(must)

// ---------- Suggerimenti ----------
export const insertSuggestions = rows => (rows.length ? supabase.from('suggestions').insert(rows).then(must) : null)
export const setSuggestionStatus = (id, status) => supabase.from('suggestions').update({ status }).eq('id', id).then(must)

// ---------- Export ----------
export async function loadBook({ onlyApproved }) {
  const chapters = await supabase.from('chapters').select('*').order('chapter_date').order('created_at').then(must)
  let q = supabase.from('blocks').select('*').order('position')
  if (onlyApproved) q = q.eq('status', 'approved')
  const blocks = await q.then(must)
  const vids = blocks.map(b => b.current_version_id).filter(Boolean)
  const versions = vids.length ? await supabase.from('block_versions').select('*').in('id', vids).then(must) : []
  return chapters
    .map(c => ({
      ...c,
      blocks: blocks
        .filter(b => b.chapter_id === c.id)
        .map(b => versions.find(v => v.id === b.current_version_id))
        .filter(Boolean),
    }))
    .filter(c => c.blocks.length)
}
