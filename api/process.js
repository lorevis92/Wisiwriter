import { callClaude, handle } from './_lib/claude.js'
import { baseSystem, bookContext, PROCESS_NEW_INSTRUCTIONS, PROCESS_REPROCESS_INSTRUCTIONS } from './_lib/prompts.js'
import { PROCESS_NEW_SCHEMA, PROCESS_REPROCESS_SCHEMA } from './_lib/schemas.js'

const MAX_WORDS_PER_PART = 1500
const MAX_TOKENS = 32000

const countWords = t => (t.trim().match(/\S+/g) || []).length

// Divide un testo lungo in parti di ~MAX_WORDS_PER_PART parole, a confine di paragrafo.
// Un paragrafo troppo lungo (es. dettato senza a capo) viene diviso per frasi, e in ultima istanza per parole.
function splitText(text, maxWords = MAX_WORDS_PER_PART) {
  if (countWords(text) <= maxWords) return [text]

  const units = []
  for (const para of text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)) {
    if (countWords(para) <= maxWords) {
      units.push({ text: para, sep: '\n\n' })
      continue
    }
    for (const sentence of para.split(/(?<=[.!?…])\s+/)) {
      if (countWords(sentence) <= maxWords) {
        units.push({ text: sentence, sep: ' ' })
        continue
      }
      const words = sentence.split(/\s+/)
      for (let i = 0; i < words.length; i += maxWords) units.push({ text: words.slice(i, i + maxWords).join(' '), sep: ' ' })
    }
    units[units.length - 1].sep = '\n\n' // fine paragrafo
  }

  const parts = []
  let cur = ''
  let curWords = 0
  let prevSep = ''
  let breakSep = '\n\n' // separatore originale tra l'ultima parte chiusa e quella corrente
  for (const u of units) {
    const w = countWords(u.text)
    if (cur && curWords + w > maxWords) {
      parts.push(cur.trim())
      breakSep = prevSep
      cur = ''
      curWords = 0
    }
    cur += (cur ? prevSep : '') + u.text
    curWords += w
    prevSep = u.sep
  }
  if (cur.trim()) {
    // Una coda piccola (< 25% di una parte) si accoda alla parte precedente invece di costare una chiamata in più
    if (parts.length && curWords < maxWords * 0.25) parts[parts.length - 1] += breakSep + cur.trim()
    else parts.push(cur.trim())
  }
  return parts
}

const fmtUpdateBlock = x =>
  `<blocco id="${x.id}" stato="${x.status === 'approved' ? 'approvato' : 'bozza'}">\n<titolo>${x.title}</titolo>\n<testo>\n${x.body}\n</testo>\n<frase_finale>${x.closing_line}</frase_finale>\n</blocco>`

function partNote(i, n, offset, reprocess) {
  if (n === 1) return ''
  return `

NOTA SULLE PARTI (questa indicazione prevale su quelle sopra riguardo agli id "new:N")
Il testo originale è lungo ed è stato diviso in ${n} parti: questa è la parte ${i + 1} di ${n}. Rielabora SOLO questa parte.
I blocchi con id "new:K" nel capitolo attuale sono quelli già creati dalle parti precedenti di questo stesso testo: sono contesto, proseguili senza ripeterli e non riscriverli.
Per i blocchi che crei ora usa gli id a partire da "new:${offset}" (il primo blocco di questa risposta è "new:${offset}", il secondo "new:${offset + 1}", ecc.).
In "chapter_summary" riassumi tutto il capitolo fin qui, compresi i blocchi delle parti precedenti e quelli di questa parte.${
    reprocess && i < n - 1
      ? '\nIn blocchi_da_aggiornare possono esserci anche blocchi che corrispondono alle parti successive del testo: sostituisci solo quelli che corrispondono a questa parte, gli altri verranno gestiti nelle parti successive.'
      : ''
  }`
}

// Body: { mode: 'new'|'reprocess', styleGuide, bookMemory, previousChapters, chapter, blocks, sessionText, sessionBlockIds }
export async function POST(request) {
  return handle(async () => {
    const b = await request.json()
    const reprocess = b.mode === 'reprocess'
    const sessionIds = new Set(b.sessionBlockIds || [])
    const otherBlocks = reprocess ? b.blocks.filter(x => !sessionIds.has(x.id)) : b.blocks
    let pendingSessionBlocks = reprocess ? b.blocks.filter(x => sessionIds.has(x.id)) : []

    const parts = splitText(b.sessionText || '')
    const blocks = []
    const suggestions = []
    const memoryAdditions = []
    let chapterSummary = ''

    for (let i = 0; i < parts.length; i++) {
      const offset = blocks.length
      // Blocchi già prodotti dalle parti precedenti, visibili come contesto con id "new:K"
      const produced = blocks.map((x, k) => ({ id: `new:${k}`, status: 'draft', title: x.title, body: x.body, closing_line: x.closing_line }))
      const chapter = chapterSummary ? { ...b.chapter, summary: chapterSummary } : b.chapter

      let user = bookContext({ ...b, chapter, blocks: [...otherBlocks, ...produced] }) + '\n\n'
      if (reprocess) {
        user += `<blocchi_da_aggiornare>\n${pendingSessionBlocks.length ? pendingSessionBlocks.map(fmtUpdateBlock).join('\n\n') : '(nessuno rimasto)'}\n</blocchi_da_aggiornare>\n\n<originale_aggiornato>\n${parts[i]}\n</originale_aggiornato>\n\n${PROCESS_REPROCESS_INSTRUCTIONS}`
      } else {
        user += `<nuovo_testo_originale>\n${parts[i]}\n</nuovo_testo_originale>\n\n${PROCESS_NEW_INSTRUCTIONS}`
      }
      user += partNote(i, parts.length, offset, reprocess)

      const { result: out, stop_reason } = await callClaude({
        system: baseSystem(b.styleGuide),
        user,
        schema: reprocess ? PROCESS_REPROCESS_SCHEMA : PROCESS_NEW_SCHEMA,
        maxTokens: MAX_TOKENS,
      })

      const partBlocks = out.blocks || []
      if (!partBlocks.length) {
        const where = parts.length > 1 ? ` nella parte ${i + 1} di ${parts.length}` : ''
        throw new Error(`L'AI non ha restituito nessun mini-capitolo${where} (stop_reason: ${stop_reason}). Riprova.`)
      }

      blocks.push(...partBlocks)
      suggestions.push(...(out.suggestions || []))
      memoryAdditions.push(...(out.memory_additions || []))
      if (out.chapter_summary) chapterSummary = out.chapter_summary

      if (reprocess) {
        const replacedNow = new Set(partBlocks.map(x => x.replaces).filter(Boolean))
        pendingSessionBlocks = pendingSessionBlocks.filter(x => !replacedNow.has(x.id))
      }
    }

    return {
      blocks,
      suggestions,
      memory_additions: memoryAdditions,
      chapter_summary: chapterSummary,
    }
  })
}
