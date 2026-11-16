async function post(path, body, isJson = true) {
  const res = await fetch(path, {
    method: 'POST',
    headers: isJson ? { 'content-type': 'application/json' } : { 'content-type': body.type || 'audio/webm' },
    body: isJson ? JSON.stringify(body) : body,
  })
  let data
  try {
    data = await res.json()
  } catch {
    throw new Error(`Errore del server (${res.status})`)
  }
  if (!res.ok || data.error) throw new Error(data.error || `Errore ${res.status}`)
  return data
}

export const aiProcess = body => post('/api/process', body)
export const aiRevise = body => post('/api/revise', body)
export const aiMerge = body => post('/api/merge', body)
export const aiTranscribe = blob => post('/api/transcribe', blob, false)
