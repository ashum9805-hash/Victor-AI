# Victor-AI

Victor-AI is a personal AI assistant built as a demo application. It combines a polished React chat interface with a Node/Express backend that integrates with Google Gemini for streaming conversations, optional web-grounded search, task tracking, personalization, project notes, and live voice interaction.

## What this project does

This repo is not just a simple chatbot. It is designed as a personal productivity and assistant experience with a UI that supports:

- conversational chat with Gemini
- web-search grounding for fresh answers
- math-mode interactions
- task and mission tracking
- memory and personalization settings
- project/workspace notes in an Atelier-style workflow
- Google Docs / Gmail / Calendar action patterns
- voice input and live voice conversation
- local persistence for sessions, tasks, and user state

## Tech stack

- Frontend: React 19 + Vite + TypeScript
- Backend: Express + Node.js
- AI layer: Google GenAI SDK (`@google/genai`)
- Styling: Tailwind CSS
- Markdown / math rendering: `react-markdown`, `remark-math`, `rehype-katex`
- Realtime: WebSockets (`ws`)
- PWA support: `vite-plugin-pwa`
- Auth / cloud patterns: Firebase integration is present in the project and used for app-level identity workflows

## Repository structure

```text
.
├── data/                       # persisted session/task/memory/project data
├── public/                     # static assets, icons, manifest, PWA graphics
├── src/
│   ├── App.tsx                 # main application logic and chat UI
│   ├── main.tsx                # React entry point
│   ├── types.ts                # chat/task/note/project models
│   ├── index.css               # application styling
│   ├── components/             # sidebar, drawers, modal, chat item, etc.
│   └── utils/                  # auth, Gmail, workspace, personalization, voice helpers
├── .env.example                # environment template
├── .gitignore
├── bun.lock                    # Bun lockfile
├── firebase-applet-config.json # Firebase applet config
├── index.html                  # Vite HTML entry
├── metadata.json               # project metadata
├── package.json                # app scripts and dependencies
├── server.ts                   # Express server and Gemini API integration
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite config
├── README.md                   # project documentation
└── LICENSE                     # optional — currently not present in repo
```

## How it works

The app has two main layers:

1. Frontend: a React application that renders the chat UI, task board, settings, voice controls, and workspace drawers.
2. Backend: an Express server that exposes endpoints for chat, task/session persistence, personalization, and live voice.

The main flow is:

- User enters a prompt in the React UI
- The frontend sends the conversation to `/api/chat`
- The backend validates the payload and calls Google Gemini
- Responses stream back using Server-Sent Events (SSE)
- The frontend updates the chat feed live and parses any executable actions contained in the response
- Actions can update tasks, save notes, switch theme, save memory, or prepare email/calendar/doc actions

This is the core logic behind the app’s “assistant” experience.

## Features

### AI chat experience
- streaming chat responses from Gemini
- optional web-search grounding
- fallback model logic
- support for casual, general, and math conversation modes

### Personal assistant features
- user sessions saved per user
- task/missions dashboard
- memory and personalization settings
- long-term user preferences
- note-taking and project workspace context

### Workspace and productivity tools
- Atelier-style project management
- project notes and notes saved into project context
- action parsing for productivity tasks
- Gmail, Google Docs, and calendar-related action patterns

### Voice and live interaction
- speech-to-text input support in the UI
- live voice conversation via WebSocket
- selectable voice configs for the live assistant

## Prerequisites

Before running the app, make sure you have:

- Node.js 18+ or Bun installed
- a Google Gemini API key

## Getting started

### 1. Install dependencies

```bash
npm install
# or
bun install
```

### 2. Configure your environment

Copy the example env file:

```bash
cp .env.example .env
```

Then add your Gemini API key:

```env
GEMINI_API_KEY=your_api_key_here
```

Optional override:

```env
GEMINI_MODEL=gemini-3.5-flash-lite
```

## Running the app

### Development mode

```bash
npm run dev
# or
bun run dev
```

This starts the Express backend and Vite frontend in development mode.

The app listens on:

```text
http://localhost:3000
```

### Production build

```bash
npm run build
npm run start
```

### Preview production build

```bash
npm run preview
```

## Important runtime notes

- The backend explicitly warns if `GEMINI_API_KEY` is missing.
- Chat functionality will fail until that env var is configured.
- Search-grounded responses depend on model availability and tool support.
- The app stores user-specific data under `data/` and persists sessions/tasks/client state in JSON files.
- The live voice endpoint is served over WebSocket at `/api/live`.

## Main API endpoints

The backend exposes several routes used by the app:

- `POST /api/chat` — streaming chat response
- `POST /api/chat/sync` — fallback non-streaming chat call
- `GET /api/sessions` / `POST /api/sessions` — session persistence
- `GET /api/tasks` / `POST /api/tasks` — task persistence
- `GET /api/personalization` / `POST /api/personalization` — memory settings
- `GET /api/atelier` / `POST /api/atelier` — project/workspace data
- `GET /api/health` — health check endpoint
- `WS /api/live` — live voice websocket connection

## Troubleshooting

### Missing Gemini API key
If you start the server without `GEMINI_API_KEY`, the app will still boot, but chat requests will fail until the key is added.

### No responses from the model
Check the server logs for Gemini-side errors such as:

- invalid or expired API key
- quota exhaustion
- model/tool unavailability

### Local persistence issues
The app keeps state in `data/` and uses browser local storage for some UI state. If you are testing a fresh clone, clearing local storage or resetting `data/` may help.

## License

There is no license file in the repository at the moment. Before publishing, redistributing, or using this project beyond personal/demo purposes, you should add an appropriate open-source license.

## Future opportunities

This repo is a strong base for continued work in any of these directions:

- deeper user auth and account management
- stronger persistence and cloud sync
- expanded productivity integrations
- better test coverage
- UI refinement and mobile polish
- production hardening for deployment

## Acknowledgements

This project uses the Google Gemini API, React, Vite, Express, and the wider TypeScript ecosystem.

