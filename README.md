# Story Weaver

# Buklat — AI Build Prompt & Architecture Document

A mobile reader/writer platform where users can publish short stories (or longer works), and readers can browse, read, and download stories for offline access. Content is auto-formatted on the reader side so writers don't need to worry about layout.

---

## 1. System Architecture

### 1.1 Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Mobile shell | Capacitor (wraps the Vite web app into installable Android/iOS apps) |
| Remote database | Supabase (Postgres, Auth, Storage) |
| Local/offline database | SQLite (via `@capacitor-community/sqlite`) |
| Editor | Tiptap (constrained rich-text, outputs structured JSON/Markdown) |
| Styling | Tailwind CSS |

### 1.2 High-level diagram

```
┌───────────────────────────────────────────┐
│              React + Vite App              │
│  ┌───────────────┐   ┌──────────────────┐ │
│  │  Reader Module │   │  Writer Module    │ │
│  │  (render +     │   │  (Tiptap editor,  │ │
│  │   pagination)  │   │   story mgmt)     │ │
│  └───────┬────────┘   └─────────┬─────────┘ │
│          │                      │           │
│  ┌───────▼──────────────────────▼────────┐ │
│  │        Data Access Layer (hooks)       │ │
│  │  - useStories() / useChapters()        │ │
│  │  - useDownloads() / useProgress()      │ │
│  │  - Handles online/offline branching    │ │
│  └───────┬──────────────────────┬────────┘ │
│          │                      │           │
│  ┌───────▼───────┐     ┌────────▼────────┐ │
│  │  SQLite (local)│     │  Supabase client│ │
│  │  - downloaded  │     │  - Postgres     │ │
│  │    stories     │     │  - Auth         │ │
│  │  - progress    │     │  - Storage      │ │
│  │  - sync queue  │     │                 │ │
│  └────────────────┘     └─────────────────┘ │
└───────────────────────────────────────────┘
             (wrapped by Capacitor for
              native Android/iOS builds)
```

### 1.3 Data model (Supabase / Postgres)

```sql
-- profiles: extends Supabase auth.users
profiles (
  id uuid primary key references auth.users(id),
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
)

-- stories
stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) not null,
  title text not null,
  description text,
  cover_url text,
  status text check (status in ('draft', 'published')) default 'draft',
  genre text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- chapters
chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete cascade not null,
  order_index int not null,
  title text,
  content jsonb not null, -- structured content (Tiptap JSON), never raw HTML
  content_hash text not null, -- for offline sync/update detection
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- reading_progress
reading_progress (
  user_id uuid references profiles(id) not null,
  story_id uuid references stories(id) not null,
  chapter_id uuid references chapters(id),
  scroll_position float default 0,
  updated_at timestamptz default now(),
  primary key (user_id, story_id)
)

-- bookmarks / likes (optional social layer)
story_likes (
  user_id uuid references profiles(id),
  story_id uuid references stories(id),
  created_at timestamptz default now(),
  primary key (user_id, story_id)
)
```

**Row Level Security (RLS):** writers can only insert/update/delete their own `stories` and `chapters`; anyone can `select` where `status = 'published'`.

### 1.4 Local SQLite schema (mirrors what's needed offline)

```sql
CREATE TABLE downloaded_stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_local_path TEXT,
  downloaded_at TEXT NOT NULL
);

CREATE TABLE downloaded_chapters (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL, -- JSON string
  content_hash TEXT NOT NULL,
  FOREIGN KEY (story_id) REFERENCES downloaded_stories(id)
);

CREATE TABLE reading_progress (
  story_id TEXT PRIMARY KEY,
  chapter_id TEXT,
  scroll_position REAL DEFAULT 0,
  updated_at TEXT,
  synced INTEGER DEFAULT 0 -- 0 = pending sync to Supabase
);
```

### 1.5 Auto-layout principle (non-negotiable design rule)

Writers never control typography. The editor only outputs a constrained structured format (Tiptap JSON: headings, paragraphs, bold/italic, images, line breaks — no custom font sizes, no manual spacing, no inline styles). The **reader component** is solely responsible for all typographic decisions — font, size, line-height, margins, theme, pagination — so every story looks consistent and readable regardless of how the writer typed it.

### 1.6 Sync strategy

- On download: fetch story + all chapters from Supabase, insert into `downloaded_*` tables in SQLite, store `content_hash` per chapter.
- On app open (if online): compare local `content_hash` vs remote for downloaded stories; re-download only changed chapters.
- Reading progress: always write to SQLite first (instant, offline-safe) with `synced = 0`; a background sync task pushes unsynced rows to Supabase's `reading_progress` table when connectivity is available, then marks `synced = 1`.

---

## 2. Project Structure

```
Buklat/
├── capacitor.config.ts
├── vite.config.ts
├── tailwind.config.js
├── package.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── Home.tsx                 # story discovery/feed
│   │   ├── StoryDetail.tsx          # story overview + chapter list
│   │   ├── Reader.tsx               # the actual reading view
│   │   ├── Library.tsx              # user's downloaded stories
│   │   ├── Editor.tsx               # writer's chapter editor
│   │   ├── MyStories.tsx            # writer's dashboard
│   │   ├── Profile.tsx
│   │   └── Auth.tsx
│   ├── components/
│   │   ├── reader/
│   │   │   ├── ReaderView.tsx       # renders structured content, owns typography
│   │   │   ├── ReaderSettings.tsx   # font size/theme controls (reader-side only)
│   │   │   └── ProgressBar.tsx
│   │   ├── editor/
│   │   │   ├── TiptapEditor.tsx     # constrained rich-text editor
│   │   │   └── ChapterList.tsx
│   │   ├── story/
│   │   │   ├── StoryCard.tsx
│   │   │   └── StoryList.tsx
│   │   └── ui/                      # buttons, inputs, modals (shared)
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client init
│   │   ├── sqlite.ts                # SQLite connection + init schema
│   │   └── contentRenderer.tsx      # converts Tiptap JSON -> React elements
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useStories.ts
│   │   ├── useChapters.ts
│   │   ├── useDownloads.ts
│   │   ├── useReadingProgress.ts
│   │   └── useNetworkStatus.ts
│   ├── services/
│   │   ├── storyService.ts          # Supabase CRUD for stories/chapters
│   │   ├── downloadService.ts       # download-to-SQLite logic
│   │   └── syncService.ts           # progress + content sync
│   ├── types/
│   │   └── index.ts                 # Story, Chapter, Profile, etc.
│   └── styles/
│       └── globals.css
├── android/                          # generated by Capacitor
├── ios/                               # generated by Capacitor
└── supabase/
    ├── migrations/
    │   └── 0001_init.sql
    └── seed.sql
```

---

## 3. The Build Prompt

Copy everything in the box below into your AI coding tool (Claude Code, Cursor, etc.) as the initial project prompt.

```
I'm building "Buklat" — a mobile app where users can be both readers and writers of short stories and long-form fiction. Build this as a React + Vite web app wrapped with Capacitor for Android/iOS.

STACK
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Mobile: Capacitor (for native builds)
- Remote DB/backend: Supabase (Postgres + Auth + Storage)
- Local DB: SQLite via @capacitor-community/sqlite (for offline downloaded stories)
- Editor: Tiptap, configured with a CONSTRAINED extension set only (headings, bold, italic, paragraph, image, blockquote, ordered/unordered list) — no custom font size, no inline styles, no text color. This is a hard requirement: writers must not be able to control typography.

CORE PRINCIPLE
All chapter content is stored as structured Tiptap JSON, never raw HTML or free-form text. The reader view is the ONLY place that decides font, size, line-height, margins, and theme, so every story renders consistently and is auto-formatted for a good reading experience regardless of how the writer entered it.

DATA MODEL
Set up Supabase with these tables (with RLS): profiles, stories, chapters, reading_progress, story_likes. [paste the SQL schema from the architecture doc section 1.3]. Writers can only modify their own stories/chapters. Anyone can read stories where status = 'published'.

Also set up a local SQLite schema for offline use: downloaded_stories, downloaded_chapters, reading_progress (with a `synced` flag). [paste schema from section 1.4]

FEATURES TO BUILD, IN THIS ORDER
1. Auth: sign up / log in via Supabase Auth (email + password to start), creates a profiles row.
2. Writer flow: create/edit/delete stories and chapters using the constrained Tiptap editor. Draft vs published status. Reorder chapters.
3. Reader flow: browse published stories (Home feed), view story detail with chapter list, and a Reader view that renders the Tiptap JSON content with consistent, adjustable typography (font size, light/dark theme) and a progress bar tied to scroll position.
4. Library + offline downloads: a "Download" button on story detail that pulls the story + all chapters into local SQLite. A Library tab lists downloaded stories and lets them be read fully offline, pulling from SQLite instead of Supabase when offline.
5. Sync: reading progress writes to SQLite immediately, then syncs to Supabase's reading_progress table when online (debounced). On app foreground, check content_hash of downloaded chapters against Supabase and re-download only what changed.
6. Capacitor setup: configure capacitor.config.ts, add Android and iOS platforms, verify the SQLite plugin works in a native build.

PROJECT STRUCTURE
Use this structure: [paste the project structure tree from section 2]

Start by scaffolding the Vite + TypeScript + Tailwind project, then set up the Supabase client and schema, then build the data hooks (useStories, useChapters, useDownloads, useReadingProgress) before touching any UI, so the app has a working data layer first. After that, build the reader flow end-to-end (read-only, online) before building the writer/editor flow. Add SQLite offline support last, once the online reading experience works.

Ask me before making assumptions about UI design — I'll want to review the reader typography and editor constraints since those are the core UX of the app.
```

---

### Notes for using this with an AI coding tool
- Feed it the architecture doc sections (SQL schemas, folder structure) as context alongside the prompt — most tools do better with the schema spelled out rather than referenced.
- Build in the suggested order (auth → writer → reader online → offline/SQLite → Capacitor) so you can test each layer before adding complexity.
- The one rule worth enforcing strictly at every step: writer input is structured data, not styled content. That's what makes "auto-layout" real instead of aspirational.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/288b0ccb-fe23-4c2a-b86f-76af57997cc8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
