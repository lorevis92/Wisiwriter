import { callClaude, handle } from './_lib/claude.js'
import { baseSystem, bookContext, PROCESS_NEW_INSTRUCTIONS, PROCESS_REPROCESS_INSTRUCTIONS } from './_lib/prompts.js'
import { PROCESS_NEW_SCHEMA, PROCESS_REPROCESS_SCHEMA } from './_lib/schemas.js'

// Body: { mode: 'new'|'reprocess', styleGuide, bookMemory, previousChapters, chapter, blocks, sessionText, sessionBlockIds }
export async function POST(request) {
  return handle(async () => {
    const b = await request.json()
    const reprocess = b.mode === 'reprocess'
    const sessionIds = new Set(b.sessionBlockIds || [])
    const otherBlocks = reprocess ? b.blocks.filter(x => !sessionIds.has(x.id)) : b.blocks
    const sessionBlocks = reprocess ? b.blocks.filter(x => sessionIds.has(x.id)) : []

    let user = bookContext({ ...b, blocks: otherBlocks }) + '\n\n'
    if (reprocess) {
      user += `<blocchi_da_aggiornare>\n${sessionBlocks
        .map(x => `<blocco id="${x.id}" stato="${x.status === 'approved' ? 'approvato' : 'bozza'}">\n<titolo>${x.title}</titolo>\n<testo>\n${x.body}\n</testo>\n<frase_finale>${x.closing_line}</frase_finale>\n</blocco>`)
        .join('\n\n')}\n</blocchi_da_aggiornare>\n\n<originale_aggiornato>\n${b.sessionText}\n</originale_aggiornato>\n\n${PROCESS_REPROCESS_INSTRUCTIONS}`
    } else {
      user += `<nuovo_testo_originale>\n${b.sessionText}\n</nuovo_testo_originale>\n\n${PROCESS_NEW_INSTRUCTIONS}`
    }

    const out = await callClaude({
      system: baseSystem(b.styleGuide),
      user,
      schema: reprocess ? PROCESS_REPROCESS_SCHEMA : PROCESS_NEW_SCHEMA,
      maxTokens: 16000,
    })
    return {
      blocks: out.blocks || [],
      suggestions: out.suggestions || [],
      memory_additions: out.memory_additions || [],
      chapter_summary: out.chapter_summary || '',
    }
  })
}
