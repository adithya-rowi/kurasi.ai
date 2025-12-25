# Kurasi.ai

## Overview

Kurasi.ai is a hyper-personalized AI news curation platform designed for Indonesian senior executives and policymakers (aged 50-70). The application creates daily intelligence briefs tailored to individual users through conversational AI onboarding that deeply understands each user's role, responsibilities, and information needs. The core value proposition is transforming overwhelming news streams into focused, actionable intelligence delivered in 5-minute daily briefs.

**Target Audience**: Indonesian executives - former ministers, central bank governors, conglomerate owners
**Language**: Fully localized in Bahasa Indonesia with professional tone
**Design**: Executive-grade aesthetic with dark navy and gold/amber colors

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with Vite bundler
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme variables (amber/gold accents)
- **Animations**: Framer Motion for transitions and micro-interactions

The frontend follows a page-based architecture with shared components. Key pages include:
- **Landing**: ChatGPT-style instant demo chat experience
- **OnboardingChat**: Conversational AI onboarding
- **Dashboard**: Daily brief display with premium UI
- **Pricing**: Subscription plans (free + premium at Rp 79.000/month)
- **Archive/Saved**: Historical briefs and saved articles

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful endpoints under `/api/` prefix
- **Build System**: Custom build script using esbuild for server, Vite for client
- **Development**: Hot module replacement via Vite middleware in development

The server handles user management, onboarding conversations, article storage, and LLM Council orchestration for news curation.

### AI Integration (6-Model LLM Council)
- **Architecture**: 6 AI models run in parallel, Claude serves as Final Judge
- **Providers**:
  - Claude (Anthropic) - HAKIM AKHIR, always required
  - GPT-4o (OpenAI) - optional
  - DeepSeek - optional
  - Perplexity - optional, real-time web search
  - Gemini (Google) - optional
  - Grok (xAI) - optional, X/Twitter insights
- **Demo Chat**: Claude Haiku for fast, cost-effective demo responses on landing page
- **Onboarding Flow**: Conversational AI that conducts 5-7 message exchanges to understand user needs
- **Brief Generation**: All configured models search in parallel, Claude judges and curates final brief
- **Streaming**: Server-Sent Events (SSE) for real-time message streaming during onboarding
- **Fallback**: System works with just Anthropic configured, shows active models in UI

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Key Tables**:
  - `users`: Core user data with onboarding status
  - `userProfiles`: AI-generated profiles including `councilSystemPrompt`
  - `onboardingConversations`: Stores conversation history as JSONB
  - `dailyBriefs`: Generated intelligence briefs with content as JSONB
  - `articles`, `userTopics`, `userPreferences`, `savedArticles`: Content and preference management

### Session Management
- Client-side session using localStorage (`kurasi_user_id`, `kurasi_session_token`)
- Full authentication system with bcrypt password hashing
- Sessions table for token-based authentication

## External Dependencies

### AI Services
- **Anthropic Claude**: Primary LLM for conversational onboarding and news curation
  - Environment variables: `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
  - Models: claude-sonnet-4-5 (onboarding), claude-haiku-4-5 (demo chat)

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle Kit**: Schema migrations via `drizzle-kit push`

### Planned Integrations
- NewsAPI for news source aggregation
- Resend API for email delivery of briefs (premium feature)
- Scheduled brief generation

### Development Tools
- Replit-specific plugins for development (cartographer, dev-banner, runtime-error-modal)
- Custom Vite plugin for OpenGraph meta tag handling

## Recent Changes

### Prompt 7 - Perplexity-Style Redesign (Current)
- Complete Landing page redesign with Perplexity-style sidebar navigation
- Kurasi speaks first - opens conversation to draw users in
- Clean white/slate aesthetic (moved from dark navy/gold)
- New onboardingChatService.ts with improved prompts that make users share more
- Profile extraction generates hyper-personalized councilSystemPrompt
- New Register page that saves profile from onboarding chat
- New Login page with email/password authentication
- Added /api/onboarding/chat endpoint (no user ID required for anonymous onboarding)
- Added /api/auth/register and /api/auth/login endpoints with bcrypt password hashing
- Added sessions table and passwordHash field to users table
- Session tokens stored client-side for future authenticated API calls

### Prompt 6 - 6 AI Council Implementation
- Complete rewrite of llmCouncil.ts to support 6 AI providers running in parallel
- Claude (Anthropic) serves as HAKIM AKHIR (Final Judge) - always included
- GPT-4o (OpenAI) - requires OPENAI_API_KEY
- DeepSeek - requires DEEPSEEK_API_KEY
- Perplexity (real-time web search) - requires PERPLEXITY_API_KEY
- Gemini (Google) - requires GOOGLE_AI_API_KEY
- Grok (xAI/Twitter) - requires XAI_API_KEY
- Graceful fallback when API keys not configured - system works with just Anthropic
- CouncilFooter now dynamically shows which models were used with icons/badges
- Added modelsUsed field to DailyBriefContent interface
- Updated /api/test/council endpoint to show all 6 AI status
- All models run in parallel for maximum speed

### Prompt 5 - Trust & Transparency
- Enhanced BriefCard with trust badges (Sangat Terpercaya/Terpercaya/Perlu Verifikasi)
- Added verification score progress bar and regional source flags (🇮🇩/🌏/🌍)
- Added "Transparansi & Verifikasi" section showing source URL, AI perspectives, verification score
- Created CouncilFooter component with transparency commitment and AI disclaimer
- Added Trust Metrics grid to Dashboard (high-trust count, Indonesian source count, AI perspectives count)
- Updated LLM prompts with TRUST_REQUIREMENTS: anti-misinformation rules, verification scoring guidelines
- Added publishedDate field to article interfaces

### Prompt 4 - Indonesian-First Search
- Implemented Indonesian-First Search Strategy with 60% minimum local source requirement
- Prioritized sources: Kontan, Bisnis Indonesia, Kompas, Tempo, Detik, CNBC Indonesia
- Added sourceType and isPaywalled fields to articles with normalization layer for backward compatibility
- BriefCard shows Indonesian flag 🇮🇩 for local sources and paywall badge for paid content
- Added /api/test/council endpoint for development testing
- Added error state UI to Dashboard with Indonesian messaging
- All council prompts now in Bahasa Indonesia

### Prompt 3 - Rebrand
- Rebranded from CurateAI to Kurasi.ai
- Updated all logos, meta tags, and branding across the app
- Created reusable Logo component
- Updated session storage key to `kurasi_user_id`

### Prompt 2 - Indonesian Refinements
- Enhanced quick prompts with icons for landing page
- Updated demo system prompt to McKinsey/BCG analyst style
- Improved onboarding conversation flow with 6-step structure
- Enhanced hero text and CTA banner styling
