import { handle } from './_lib/claude.js'

// Body: audio grezzo (audio/webm, audio/mp4...). Limite Vercel ~4.5 MB per richiesta:
// il registratore nel frontend spezza automaticamente le registrazioni lunghe.
export async function POST(request) {
  return handle(async () => {
    const type = request.headers.get('content-type') || 'audio/webm'
    const buf = await request.arrayBuffer()
    if (!buf.byteLength) throw new Error('Audio vuoto')
    const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : 'webm'

    const form = new FormData()
    form.append('file', new Blob([buf], { type }), `audio.${ext}`)
    form.append('model', 'whisper-1')
    form.append('language', 'it')

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    })
    if (!res.ok) throw new Error(`Trascrizione fallita (${res.status}): ${(await res.text()).slice(0, 300)}`)
    const data = await res.json()
    return { text: data.text || '' }
  })
}
