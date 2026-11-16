// Avvisa le altre parti dell'app (es. la navbar) che un libro è stato modificato (titolo, ecc.)
const EVENT = 'wisiwriter:book-changed'

export const notifyBookChanged = bookId => window.dispatchEvent(new CustomEvent(EVENT, { detail: { bookId } }))

export function onBookChanged(fn) {
  const handler = e => fn(e.detail?.bookId)
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
