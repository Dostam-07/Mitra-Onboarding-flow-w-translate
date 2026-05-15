# Mitra Onboarding

A mobile-first Progressive Web App (PWA) built for onboarding field workers (Mitras) with multilingual support (English, Hindi, Kannada).

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [npm](https://www.npmjs.com/) (v10+ recommended)

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## Scripts

- `npm run dev`: Starts the local development server.
- `npm run build`: Builds the application for production into the `dist/public` folder.
- `npm run serve`: Previews the production build locally.
- `npm run typecheck`: Runs TypeScript type checking without emitting files.

## Technology Stack

- **Framework**: React with Vite
- **Styling**: Tailwind CSS & Radix UI (shadcn/ui style)
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **State/Query**: Tanstack React Query
- **Database**: Firebase (Offline-ready with Mock mode support)
