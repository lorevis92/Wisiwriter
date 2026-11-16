export const TOOL_NAME = 'salva_risultato'

// Chiama Claude obbligandolo a restituire il risultato tramite lo strumento "salva_risultato".
// Nota: i modelli recenti (es. claude-opus-5-5) rifiutano tool_choice forzato ("tool"/"any") con un 400,
// quindi usiamo tool_choice "auto" + strict: true (input garantito conforme allo schema) + istruzione nel prompt.
// Restituisce { result, stop_reason, usage }.
export async function callClaude({ system, user, schema, maxTokens = 8000 }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
      tools: [
        {
          name: TOOL_NAME,
          description: 'Salva il risultato del lavoro. Chiamalo sempre, una sola volta, con il risultato completo.',
          input_schema: schema,
          strict: true,
        },
      ],
      tool_choice: { type: 'auto', disable_parallel_tool_use: true },
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Claude API ${res.status}: ${t.slice(0, 500)}`)
  }
  const data = await res.json()
  console.log(`[claude] stop_reason=${data.stop_reason} usage=${JSON.stringify(data.usage)}`)
  if (data.stop_reason === 'max_tokens') {
    throw new Error(`Risposta AI troncata: testo troppo lungo (max_tokens ${maxTokens} raggiunto)`)
  }
  const content = data.content || []
  const tool = content.find(c => c.type === 'tool_use' && c.name === TOOL_NAME)
  if (!tool) {
    const text = content.filter(c => c.type === 'text').map(c => c.text).join('')
    throw new Error(`Claude non ha usato lo strumento ${TOOL_NAME} (stop_reason: ${data.stop_reason}). Testo: ${text.slice(0, 300) || '(nessuno)'}`)
  }
  return { result: tool.input, stop_reason: data.stop_reason, usage: data.usage }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export async function handle(fn) {
  try {
    return json(await fn())
  } catch (err) {
    console.error(err)
    return json({ error: err.message || String(err) }, 500)
  }
}
