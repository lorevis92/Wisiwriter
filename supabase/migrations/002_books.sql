-- Wisiwriter — migrazione 002: livello "Libro"
-- Più libri, ognuno con i suoi capitoli, la sua guida di stile e la sua memoria.
-- Non distruttiva e idempotente: si può eseguire più volte senza perdere dati.
-- Tutti i capitoli esistenti finiscono nel primo libro ("Diario di un trader milionario"),
-- che riceve guida di stile e memoria dalla riga esistente di wisiwriter_book_memory.
-- wisiwriter_book_memory NON viene eliminata (resta inutilizzata).

begin;

-- 1. Tabella dei libri
create table if not exists wisiwriter_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  style_guide text not null default '',
  memory text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table wisiwriter_books enable row level security;
drop policy if exists "anon_all" on wisiwriter_books;
create policy "anon_all" on wisiwriter_books for all to anon, authenticated using (true) with check (true);

-- 2. Colonna book_id sui capitoli (prima nullable, per poterla valorizzare)
alter table wisiwriter_chapters add column if not exists book_id uuid;

do $$ begin
  alter table wisiwriter_chapters add constraint wisiwriter_chapters_book_fk
    foreign key (book_id) references wisiwriter_books(id) on delete cascade;
exception when duplicate_object then null; end $$;

-- 3. Primo libro (solo se non esiste ancora nessun libro) + assegnazione dei capitoli esistenti
do $$
declare
  first_book uuid;
begin
  select id into first_book from wisiwriter_books order by created_at limit 1;

  if first_book is null then
    insert into wisiwriter_books (title, style_guide, memory)
    values (
      'Diario di un trader milionario',
      coalesce((select style_guide from wisiwriter_book_memory where id = 1), ''),
      coalesce((select memory from wisiwriter_book_memory where id = 1), '')
    )
    returning id into first_book;
  end if;

  update wisiwriter_chapters set book_id = first_book where book_id is null;
end $$;

-- 4. Ora che tutti i capitoli hanno un libro: not null + indice
alter table wisiwriter_chapters alter column book_id set not null;
create index if not exists idx_wisiwriter_chapters_book on wisiwriter_chapters(book_id);

commit;
