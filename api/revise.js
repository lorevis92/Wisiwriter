import { callClaude, handle } from './_lib/claude.js'
import { baseSystem, bookContext, REVISE_INSTRUCTIONS } from './_lib/prompts.js'
import { REVISE_SCHEMA } from './_lib/schemas.js'

// Body: { styleGuide, bookMemory, previousChapters, chapter, blocks, block, notes: [{quote, note}], originalText }
export async function POST(request) {
  return handle(async () => {
    const b = await request.json()
    const others = (b.blocks || []).filter(x => x.id !== b.block.id)
    const notes = b.notes
      .map((n, i) => `<nota n="${i + 1}">${n.quote ? `\n<citazione>${n.quote}</citazione>` : '\n<citazione>(blocco in generale)</citazione>'}\n<indicazione>${n.note}</indicazione>\n</nota>`)
      .join('\n')
    const user = `${bookContext({ ...b, blocks: others })}

<originale_di_lorenzo>
${b.originalText || '(non disponibile)'}
</originale_di_lorenzo>

<blocco_da_rivedere>
<titolo>${b.block.title}</titolo>
<testo>
${b.block.body}
</testo>
<frase_finale>${b.block.closing_line}</frase_finale>
</blocco_da_rivedere>

<note_di_lorenzo>
${notes}
</note_di_lorenzo>

${REVISE_INSTRUCTIONS}`
    const out = await callClaude({ system: baseSystem(b.styleGuide), user, schema: REVISE_SCHEMA, maxTokens: 6000 })
    return {
      title: out.title || b.block.title,
      body: out.body || b.block.body,
      closing_line: out.closing_line ?? b.block.closing_line,
      memory_additions: out.memory_additions || [],
    }
  })
}
