import { callClaude, handle } from './_lib/claude.js'
import { baseSystem, MERGE_INSTRUCTIONS } from './_lib/prompts.js'
import { MERGE_SCHEMA } from './_lib/schemas.js'

// Body: { styleGuide, bookMemory, blocks: [{title, body, closing_line}], hint }
export async function POST(request) {
  return handle(async () => {
    const b = await request.json()
    const user = `<memoria_del_libro>
${b.bookMemory || '(vuota)'}
</memoria_del_libro>

${b.blocks
  .map((x, i) => `<blocco n="${i + 1}">\n<titolo>${x.title}</titolo>\n<testo>\n${x.body}\n</testo>\n<frase_finale>${x.closing_line}</frase_finale>\n</blocco>`)
  .join('\n\n')}

${b.hint ? `<motivo_unione>${b.hint}</motivo_unione>\n\n` : ''}${MERGE_INSTRUCTIONS}`
    const { result: out } = await callClaude({ system: baseSystem(b.styleGuide), user, schema: MERGE_SCHEMA, maxTokens: 6000 })
    return { title: out.title, body: out.body, closing_line: out.closing_line || '' }
  })
}
