# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kurasi.ai is a hyper-personalized AI news curation platform for Indonesian senior executives. It creates daily intelligence briefs through conversational AI onboarding. The platform uses a 6-AI-model council where Claude serves as the Final Judge (HAKIM AKHIR).

**Language**: Bahasa Indonesia throughout the application.

## Commands

```bash
npm run dev          # Start Express server with Vite HMR (development)
npm run build        # Build client (Vite) + server (esbuild) to dist/
npm start            # Run production server from dist/index.cjs
npm run check        # TypeScript type checking
npm run db:push      # Apply Drizzle ORM migrations to PostgreSQL
```

## Architecture

### Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: Wouter (client-side)
- **State**: TanStack React Query

### Directory Structure
```
client/src/
├── pages/           # Route-based pages (Landing, Dashboard, Onboarding, etc.)
├── components/      # React components (Dashboard/, ui/)
├── hooks/           # Custom React hooks
├── lib/             # Utilities (api.ts, queryClient, session)
└── App.tsx          # Main router

server/
├── index.ts         # Express app setup
├── routes.ts        # All API endpoints (30+)
├── storage.ts       # Data access layer (IStorage interface)
├── services/        # Business logic
│   ├── llmCouncil.ts           # 6-AI-model council orchestration
│   ├── onboardingChatService.ts # Onboarding chat flows
│   └── demoChatService.ts       # Landing page demo chat
└── db.ts            # Database connection

shared/
└── schema.ts        # Drizzle ORM schema + Zod validators (shared types)
```

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

### AI Council (6 Models)
All models run in parallel; Claude curates the final brief:
- **Claude** (Anthropic) - HAKIM AKHIR, always required
- **GPT-4o** (OpenAI) - optional
- **DeepSeek** - optional
- **Perplexity** - real-time web search, optional
- **Gemini** (Google) - optional
- **Grok** (xAI) - optional

System works with just Anthropic configured; shows active models in UI.

### Key Data Flow
1. Landing page → Demo chat via Claude Haiku
2. Onboarding → 5-7 message conversational exchange
3. Profile extraction → Custom `councilSystemPrompt` for personalization
4. Dashboard → `/api/brief/latest` shows council results with trust metrics

### Authentication
- Session-based with bcrypt password hashing
- Client stores tokens in localStorage: `kurasi_user_id`, `kurasi_session_token`

### Environment Variables
Required:
- `DATABASE_URL` - PostgreSQL connection string
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` - Anthropic API key

Optional (for additional council members):
- `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `PERPLEXITY_API_KEY`, `GOOGLE_AI_API_KEY`, `XAI_API_KEY`

### API Testing
- `/api/test/council` - Test endpoint showing all 6 AI model status
