-- Wisiwriter — schema Supabase
-- Esegui tutto nello SQL Editor di Supabase (una volta sola).

create extension if not exists pgcrypto;

-- Capitoli = giorni in cui scrivi
create table if not exists wisiwriter_chapters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  chapter_date date not null default current_date,
  summary text not null default '',
  created_at timestamptz not null default now()
);

-- Sessioni = ogni volta che scrivi/detti dentro un capitolo (il tuo originale, modificabile)
create table if not exists wisiwriter_sessions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references wisiwriter_chapters(id) on delete cascade,
  original_text text not null,
  input_type text not null default 'text',          -- 'text' | 'voice' | 'mixed'
  processed_at timestamptz,                          -- ultima rielaborazione AI
  original_updated_at timestamptz,                   -- ultima modifica dell'originale
  created_at timestamptz not null default now()
);

-- Blocchi = mini-capitoli creati dall'AI
create table if not exists wisiwriter_blocks (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references wisiwriter_chapters(id) on delete cascade,
  session_id uuid references wisiwriter_sessions(id) on delete set null,
  position double precision not null default 0,
  status text not null default 'draft',              -- 'draft' | 'approved'
  current_version_id uuid,
  needs_review boolean not null default false,
  review_reason text,
  created_at timestamptz not null default now()
);

create table if not exists wisiwriter_block_versions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references wisiwriter_blocks(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  closing_line text not null default '',
  source text not null default 'ai',                 -- 'ai' | 'manual' | 'notes' | 'reprocess' | 'merge'
  created_at timestamptz not null default now()
);

do $$ begin
  alter table wisiwriter_blocks add constraint wisiwriter_blocks_current_version_fk
    foreign key (current_version_id) references wisiwriter_block_versions(id) on delete set null;
exception when duplicate_object then null; end $$;

-- Note mirate su un pezzo di testo di un blocco
create table if not exists wisiwriter_block_notes (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references wisiwriter_blocks(id) on delete cascade,
  quote text not null default '',                    -- testo evidenziato ('' = nota generale)
  note text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Suggerimenti strutturali e di memoria proposti dall'AI
create table if not exists wisiwriter_suggestions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references wisiwriter_chapters(id) on delete cascade,
  kind text not null,                                -- 'merge' | 'move' | 'note' | 'memory'
  text text not null,
  block_ids uuid[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'open',               -- 'open' | 'applied' | 'dismissed'
  created_at timestamptz not null default now()
);

-- Memoria del libro (una riga sola)
create table if not exists wisiwriter_book_memory (
  id int primary key default 1,
  style_guide text not null default '',
  memory text not null default '',
  updated_at timestamptz not null default now(),
  constraint book_memory_single check (id = 1)
);

-- Traduzioni (pronte per dopo): una per blocco per lingua
create table if not exists wisiwriter_block_translations (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references wisiwriter_blocks(id) on delete cascade,
  lang text not null,
  title text not null default '',
  body text not null default '',
  closing_line text not null default '',
  source_version_id uuid references wisiwriter_block_versions(id) on delete set null,
  stale boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (block_id, lang)
);

create index if not exists idx_wisiwriter_sessions_chapter on wisiwriter_sessions(chapter_id);
create index if not exists idx_wisiwriter_blocks_chapter on wisiwriter_blocks(chapter_id);
create index if not exists idx_wisiwriter_block_versions_block on wisiwriter_block_versions(block_id);
create index if not exists idx_wisiwriter_block_notes_block on wisiwriter_block_notes(block_id);
create index if not exists idx_wisiwriter_suggestions_chapter on wisiwriter_suggestions(chapter_id);

-- Nessun login: accesso libero con la anon key (il link non lo conosce nessuno)
do $$
declare t text;
begin
  foreach t in array array['wisiwriter_chapters','wisiwriter_sessions','wisiwriter_blocks','wisiwriter_block_versions','wisiwriter_block_notes','wisiwriter_suggestions','wisiwriter_book_memory','wisiwriter_block_translations'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "anon_all" on %I', t);
    execute format('create policy "anon_all" on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
