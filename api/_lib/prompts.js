const fmtBlock = (b, i) =>
  `<blocco id="${b.id}" posizione="${i + 1}" stato="${b.status === 'approved' ? 'approvato' : 'bozza'}">
<titolo>${b.title}</titolo>
<testo>
${b.body}
</testo>
<frase_finale>${b.closing_line}</frase_finale>
</blocco>`

export function baseSystem(styleGuide) {
  return `Sei l'editor e ghostwriter del libro "Diario di un trader milionario" di Lorenzo. Lui scrive di getto o detta a voce, in prosa, senza preoccuparsi della forma. Tu trasformi il suo materiale grezzo in pagine del libro, nella sua voce.

Segui SEMPRE questa guida di stile:
<guida_di_stile>
${styleGuide}
</guida_di_stile>

Scrivi in italiano. Restituisci il risultato con lo strumento salva_risultato. Nei campi di testo usa \\n\\n per separare i paragrafi.`
}

export function bookContext({ bookMemory, previousChapters = [], chapter, blocks = [] }) {
  const prev = previousChapters.length
    ? previousChapters.map(c => `- ${c.date} — ${c.title}: ${c.summary || '(nessun riassunto)'}`).join('\n')
    : '(questo è il primo capitolo)'
  return `<memoria_del_libro>
${bookMemory || '(vuota)'}
</memoria_del_libro>

<capitoli_precedenti>
${prev}
</capitoli_precedenti>

<capitolo_attuale data="${chapter.date}" titolo_interno="${chapter.title}">
<riassunto>${chapter.summary || '(nessuno)'}</riassunto>
${blocks.length ? blocks.map(fmtBlock).join('\n\n') : '(nessun blocco ancora)'}
</capitolo_attuale>`
}

export const PROCESS_NEW_INSTRUCTIONS = `COMPITO
Qui sotto c'è un NUOVO pezzo di testo originale di Lorenzo per il capitolo attuale. Rielabora SOLO questo nuovo pezzo, trasformandolo in uno o più mini-capitoli. Non riscrivere i blocchi esistenti: sono contesto, servono per continuità, tono e per evitare ripetizioni.

Guarda anche l'insieme del capitolo e del libro e, se serve, proponi suggerimenti strutturali (non applicarli tu):
- "merge": un nuovo blocco continua un blocco esistente e starebbero meglio uniti (block_ids: [id esistente, "new:N"])
- "move": un blocco starebbe meglio in un'altra posizione (block_ids: [id o "new:N"], new_position: numero 1-based)
- "note": qualsiasi altra osservazione utile (ripetizioni con capitoli precedenti, incongruenze, un punto da approfondire) con block_ids pertinenti
Per riferirti ai blocchi che stai creando ora usa "new:0", "new:1", ecc. Proponi solo suggerimenti davvero utili; zero va benissimo.

MEMORIA
In "memory_additions" elenca i fatti nuovi da ricordare per il resto del libro: personaggi nuovi, soprannomi, ricorrenze, e SOPRATTUTTO ogni dettaglio che hai inventato tu (prezzi, nomi di indicatori, cifre), così resterà coerente. Frasi brevi. Non ripetere ciò che è già nella memoria.

RIASSUNTO
In "chapter_summary" scrivi un riassunto aggiornato dell'intero capitolo (blocchi esistenti + nuovi) in 2-4 frasi, utile come contesto per i capitoli futuri.

Restituisci il risultato con lo strumento salva_risultato.`

export const PROCESS_REPROCESS_INSTRUCTIONS = `COMPITO
Lorenzo ha MODIFICATO un suo testo originale che era già stato rielaborato. Qui sotto trovi l'originale aggiornato e i blocchi che erano stati generati da quella versione precedente (blocchi_da_aggiornare). Rielabora l'originale aggiornato.

Regole:
- Per ogni blocco che produci indica in "replaces" l'id del blocco esistente che sostituisce, oppure null se è un blocco nuovo.
- Mantieni la stessa suddivisione dei blocchi esistenti quando ha ancora senso; cambia solo dove la modifica di Lorenzo lo richiede.
- Se un blocco esistente approvato non è toccato dalle modifiche, riproponilo identico.
- Un blocco esistente che non sostituisci con nulla verrà segnalato a Lorenzo come "non corrisponde più all'originale".
- Gli altri blocchi del capitolo sono contesto: non riscriverli.

Suggerimenti strutturali, memory_additions e chapter_summary come sempre (vedi lo strumento salva_risultato). Per i blocchi nuovi usa "new:N" dove N è l'indice nell'array "blocks".

Restituisci il risultato con lo strumento salva_risultato.`

export const REVISE_INSTRUCTIONS = `COMPITO
Riscrivi il blocco qui sotto seguendo le note di Lorenzo. Ogni nota può riferirsi a un pezzo di testo preciso (citazione) oppure al blocco in generale. Cambia ciò che le note chiedono e quello che serve perché il blocco resti scorrevole; il resto lascialo com'è. Hai anche il testo originale di Lorenzo da cui è nato il blocco, utile se una nota chiede di recuperare qualcosa.

Se cambi o inventi dettagli nuovi (prezzi, nomi, cifre) elencali in "memory_additions".

Restituisci il risultato con lo strumento salva_risultato.`

export const MERGE_INSTRUCTIONS = `COMPITO
Unisci i blocchi qui sotto in un unico mini-capitolo scorrevole, nell'ordine dato. Non perdere fatti, elimina le ripetizioni, un solo titolo e una sola frase finale.

Restituisci il risultato con lo strumento salva_risultato.`
