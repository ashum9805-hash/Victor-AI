# Victor-AI

Victor-AI is a personal AI assistant demo built with React and a Node/Express backend. It pairs a conversational chat interface with task tracking, memory, workspace/project notes, Google-integrated actions, and optional live voice interaction powered by Gemini.

## Overview

This project is designed as a polished AI companion experience rather than a generic chat demo. The app includes:

- streaming chat responses from Google Gemini
- optional web-search grounding for up-to-date answers
- task and mission tracking
- personalization and long-term memory
- project/workspace notes in an "Atelier" flow
- email/doc/calendar action support patterns
- live voice conversation over WebSockets
- PWA-friendly frontend assets

## Features

### Conversational AI
- Chat with Gemini through a streaming SSE endpoint
- supports `casual`, `math`, and `general` modes
- includes search grounding when enabled
- supports code execution output when available

### Personal assistant workflows
- persistent sessions and tasks per user
- user memory / personalization settings
- task actions like add, complete, delete, and theme changes
- quick note and project-note actions

### Workspace and productivity features
- atelier/project management
- project notes for contextual workspaces
- Google Docs / Gmail / Calendar integration patterns and action prompts

### Voice and live interaction
- WebSocket live API for bidirectional voice conversation
- multiple voice presets in the live audio flow
- speech-to-text input support in the frontend

## Tech stack

- Frontend: React 19 + Vite + TypeScript
- Backend: Express + Node.js
- AI: Google GenAI SDK (`@google/genai`)
- Styling: Tailwind CSS
- Media/UX: lucide-react, react-markdown, remark-math, rehype-katex
- Real-time: WebSockets (`ws`)
- PWA support: `vite-plugin-pwa`

## Project structure

```text
.
├── data/                        # persisted session/task/memory data
├── public/                      # static assets, icons, PWA files
├── src/
│   ├── App.tsx                  # main app shell and all core app logic
│   ├── main.tsx                 # app bootstrap
│   ├── types.ts                 # shared TypeScript interfaces
│   ├── index.css                # app styles
│   └── components/              # UI components (sidebar, drawers, modals, etc.)
├── .env.example                 # environment variable template
├── index.html                   # Vite HTML entry
├── metadata.json                # project metadata
├── package.json                 # scripts and dependencies
├── server.ts                    # Express server and Gemini API integration
├── tsconfig.json                # TypeScript config
├── vite.config.ts               # Vite config
├── bun.lock                     # Bun lockfile
├── firebase-applet-config.json  # Firebase config artifact
├── .gitignore
└── README.md
```

## Getting started

### Prerequisites

- Node.js 18+ or Bun
- a Google Gemini API key

### Install dependencies

```bash
npm install
# or
bun install
```

### Environment setup

Copy the example environment file and add your Gemini API key:

```bash
cp .env.example .env
```

Then add the required value:

```env
GEMINI_API_KEY=your_api_key_here
```

If you are using a different model or want to override the default, you can also set:

```env
GEMINI_MODEL=gemini-3.5-flash-lite
```

## Running the app

### Development

```bash
npm run dev
# or
bun run dev
```

This starts the Express server and the Vite frontend in development mode.

### Production build

```bash
npm run build
npm run start
```

### Preview production bundle

```bash
npm run preview
```

## Runtime behavior

The app starts an Express server on port 3000. The frontend communicates with:

- `/api/chat` for streaming chat responses
- `/api/chat/sync` for synchronous fallback requests
- `/api/sessions` for session persistence
- `/api/tasks` for mission/task persistence
- `/api/personalization` for memory customization
- `/api/atelier` for project/workspace data
- `/api/live` for live voice WebSocket sessions

The backend validates incoming payloads, applies a lightweight rate limiter, and tries a primary Gemini model with graceful fallbacks.

## Notes

- The app is intentionally designed as a demo/personal assistant rather than a general-purpose product template.
- Search grounding and live voice features depend on available model capabilities and environment configuration.
- Responses should still be checked for correctness and accuracy before being relied on for critical work.

## License

No explicit license file is present in the repo at the moment, so licensing status should be confirmed before redistribution or commercial use.

## Contributing

This repo appears to be a personal project/demo. If you want to extend it, the most natural areas are:

- improving the chat system prompts
- expanding workspace/project data models
- adding stronger auth and persistence layers
- integrating more external service actions
- refining the frontend UX and mobile behavior

## Acknowledgements

- Google Gemini / Google GenAI
- React, Vite, Express, and the rest of the TypeScript ecosystem used in this project
