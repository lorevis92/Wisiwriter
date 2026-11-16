export async function callClaude({ system, user, maxTokens = 8000 }) {
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
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Claude API ${res.status}: ${t.slice(0, 500)}`)
  }
  const data = await res.json()
  return (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('')
}

export function parseJson(text) {
  const s = text.indexOf('{')
  const e = text.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('Risposta AI non in formato JSON')
  return JSON.parse(text.slice(s, e + 1))
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
