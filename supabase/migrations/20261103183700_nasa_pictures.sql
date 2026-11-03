-- Table nasa_pictures: Caches NASA APOD metadata and Gemini Hebrew explanations
create table if not exists public.nasa_pictures (
  date text primary key,
  english_title text not null,
  english_explanation text not null,
  media_type text not null default 'image',
  image_url text not null,
  hebrew_title text not null,
  hebrew_summary text not null,
  tags jsonb not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: ON with NO policies (server uses secret key)
alter table public.nasa_pictures enable row level security;

