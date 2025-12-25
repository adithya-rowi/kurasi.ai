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

### AI Integration (LLM Council)
- **Provider**: Anthropic Claude via SDK
- **Demo Chat**: Claude Haiku for fast, cost-effective demo responses on landing page
- **Onboarding Flow**: Conversational AI that conducts 5-7 message exchanges to understand user needs
- **Brief Generation**: Multiple LLM "council members" search and curate news in parallel
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
- Client-side session using localStorage (`kurasi_user_id`)
- No authentication system implemented yet (designed for but not built)

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

### Prompt 3 - Rebrand (Current)
- Rebranded from CurateAI to Kurasi.ai
- Updated all logos, meta tags, and branding across the app
- Created reusable Logo component
- Updated session storage key to `kurasi_user_id`

### Prompt 2 - Indonesian Refinements
- Enhanced quick prompts with icons for landing page
- Updated demo system prompt to McKinsey/BCG analyst style
- Improved onboarding conversation flow with 6-step structure
- Enhanced hero text and CTA banner styling
