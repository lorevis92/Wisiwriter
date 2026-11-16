# Wisi Diario

App per scrivere **"Diario di un trader milionario"** da qualunque dispositivo.
Scrivi o detti in prosa, l'AI riscrive in mini-capitoli (titolo + frase finale) con la tua voce.

## Come funziona

- **Capitolo** = un giorno in cui scrivi (il nome lo dai tu, la data diventa il titolo nel libro).
- **Originale** = ogni volta che scrivi/detti nasce una sessione. È tua, la puoi modificare quando vuoi.
  Se modifichi un originale già rielaborato compare "Rielabora dalla mia versione".
- **Mini-capitoli** = li crea l'AI. Rielabora solo il pezzo nuovo, ma legge tutto il capitolo,
  i riassunti dei capitoli precedenti e la Memoria del libro, e propone suggerimenti (unire, spostare, osservazioni)
  che applichi tu.
- **Note** = seleziona una frase in un mini-capitolo → "+ Nota per l'AI" → poi "Applica note".
- **Versioni** = ogni modifica crea una versione. "Approva" tiene solo quella approvata.
- **Memoria del libro** = guida di stile + personaggi/ricorrenze/dettagli inventati.
- **Esporta** = Word o PDF, con date come capitoli.
- **Traduzioni** = tabella `block_translations` già pronta (una per mini-capitolo per lingua, segnata "stale"
  quando il testo cambia). Lingue in `src/config.js`. Interfaccia da fare più avanti.

## Setup

1. **Supabase** → nuovo progetto → SQL Editor → incolla ed esegui `supabase/schema.sql`.
2. **Logo** → copia `logo-diario.png` e `logo-wisiverse.png` in `/public` (senza logo mostra il nome in testo).
3. **GitHub** → crea il repo e fai push.
4. **Vercel** → importa il repo (framework: Vite) e aggiungi le variabili d'ambiente:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-opus-5-5`)
   - `OPENAI_API_KEY` (trascrizione vocale con Whisper)
5. In locale: `npm install` e poi `vercel dev` (serve per le funzioni in `/api`; `npm run dev` avvia solo il frontend).

## Struttura

- `api/` — funzioni serverless Vercel: `process` (rielabora/aggiorna), `revise` (applica note), `merge` (unisce blocchi), `transcribe` (voce → testo). Prompt in `api/_lib/prompts.js`.
- `src/lib/actions.js` — orchestrazione (contesto per l'AI, creazione blocchi, suggerimenti).
- `src/lib/db.js` — accesso a Supabase.
- `src/config.js` — nome app, guida di stile iniziale, lingue future.

Nessun login: chi ha il link può usare l'app.
