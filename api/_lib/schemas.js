// Schemi JSON per lo strumento "salva_risultato" (strict: tutti i campi required, niente proprietà extra)

const str = description => ({ type: 'string', description })

const memoryAdditions = {
  type: 'array',
  description: 'Fatti nuovi da ricordare per il resto del libro (personaggi, ricorrenze, dettagli inventati). Frasi brevi. Può essere vuoto.',
  items: { type: 'string' },
}

const blockFields = {
  title: str('Titolo breve e concreto del mini-capitolo'),
  body: str('Testo del mini-capitolo in prosa; paragrafi separati da una riga vuota'),
  closing_line: str('Frase finale che riassume la vibe del mini-capitolo'),
}

const suggestions = {
  type: 'array',
  description: 'Suggerimenti strutturali (zero va benissimo)',
  items: {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['merge', 'move', 'note'] },
      text: str('Spiegazione del suggerimento'),
      block_ids: {
        type: 'array',
        description: 'Id dei blocchi esistenti o "new:N" per i blocchi creati ora',
        items: { type: 'string' },
      },
      new_position: {
        type: ['integer', 'null'],
        description: 'Solo per "move": posizione 1-based di destinazione; altrimenti null',
      },
    },
    required: ['kind', 'text', 'block_ids', 'new_position'],
    additionalProperties: false,
  },
}

const chapterSummary = str("Riassunto aggiornato dell'intero capitolo in 2-4 frasi")

function processSchema(withReplaces) {
  const blockProps = withReplaces
    ? { replaces: { type: ['string', 'null'], description: "Id del blocco esistente che sostituisce, o null se è nuovo" }, ...blockFields }
    : blockFields
  return {
    type: 'object',
    properties: {
      blocks: {
        type: 'array',
        items: {
          type: 'object',
          properties: blockProps,
          required: Object.keys(blockProps),
          additionalProperties: false,
        },
      },
      suggestions,
      memory_additions: memoryAdditions,
      chapter_summary: chapterSummary,
    },
    required: ['blocks', 'suggestions', 'memory_additions', 'chapter_summary'],
    additionalProperties: false,
  }
}

export const PROCESS_NEW_SCHEMA = processSchema(false)
export const PROCESS_REPROCESS_SCHEMA = processSchema(true)

export const REVISE_SCHEMA = {
  type: 'object',
  properties: { ...blockFields, memory_additions: memoryAdditions },
  required: ['title', 'body', 'closing_line', 'memory_additions'],
  additionalProperties: false,
}

export const MERGE_SCHEMA = {
  type: 'object',
  properties: blockFields,
  required: ['title', 'body', 'closing_line'],
  additionalProperties: false,
}
