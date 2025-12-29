# Kurasi.ai

AI-powered personalized news curation for executives. Select your sources, topics, and people to follow — receive curated daily briefs.

## Architecture

3-Layer AI Council:
- **Search**: Perplexity, Gemini, Grok (parallel)
- **Analysis**: DeepSeek V3.2, GPT-5 mini (parallel)
- **Judge**: Claude Opus 4.5 (final curation)

## Tech Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind
- Backend: Express.js + TypeScript
- Database: PostgreSQL + Drizzle ORM

## Setup
```bash
npm install
npm run dev
```

## Environment Variables
```
DATABASE_URL=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
XAI_API_KEY=
PERPLEXITY_API_KEY=
DEEPSEEK_API_KEY=
RESEND_API_KEY=
```
