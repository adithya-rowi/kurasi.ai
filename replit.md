# CurateAI

## Overview

CurateAI is a hyper-personalized AI news curation platform designed for senior executives and policymakers. The application creates daily intelligence briefs tailored to individual users through conversational AI onboarding that deeply understands each user's role, responsibilities, and information needs. The core value proposition is transforming overwhelming news streams into focused, actionable intelligence delivered in 5-minute daily briefs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with Vite bundler (not Next.js despite initial design docs)
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme variables
- **Animations**: Framer Motion for transitions and micro-interactions

The frontend follows a page-based architecture with shared components. Key pages include Landing, OnboardingChat (conversational AI onboarding), Dashboard (daily brief display), Archive, and Saved articles.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful endpoints under `/api/` prefix
- **Build System**: Custom build script using esbuild for server, Vite for client
- **Development**: Hot module replacement via Vite middleware in development

The server handles user management, onboarding conversations, article storage, and LLM Council orchestration for news curation.

### AI Integration (LLM Council)
- **Provider**: Anthropic Claude via SDK
- **Onboarding Flow**: Conversational AI that conducts 5-10 message exchanges to understand user needs, then generates a personalized `council_system_prompt`
- **Brief Generation**: Multiple LLM "council members" search and curate news in parallel, each using the user's personalized system prompt
- **Streaming**: Server-Sent Events (SSE) for real-time message streaming during onboarding

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
- Client-side session using localStorage (`curateai_user_id`)
- No authentication system implemented yet (designed for but not built)

## External Dependencies

### AI Services
- **Anthropic Claude**: Primary LLM for conversational onboarding and news curation
  - Environment variables: `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
  - Models: claude-sonnet-4-5 (balanced), claude-opus-4-5 (capable), claude-haiku-4-5 (fast)

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle Kit**: Schema migrations via `drizzle-kit push`

### Planned Integrations (Not Yet Implemented)
- NewsAPI for news source aggregation
- Resend API for email delivery of briefs
- Vercel Cron Jobs or Trigger.dev for scheduled brief generation

### Development Tools
- Replit-specific plugins for development (cartographer, dev-banner, runtime-error-modal)
- Custom Vite plugin for OpenGraph meta tag handling