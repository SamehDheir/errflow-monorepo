# errflow Dashboard

A Next.js 14 dashboard for errflow - a service that monitors runtime errors and provides insights for Node.js applications.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS**
- **shadcn/ui** components
- **next-auth v5** (authentication)
- **TanStack Query v5** (data fetching)
- **Zustand** (global state)
- **Recharts** (charts)
- **Socket.IO client** (real-time updates)
- **date-fns** (date formatting)
- **zod** (form validation)
- **react-hook-form** (forms)
- **sonner** (toasts)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running on `http://localhost:3001`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
errflow-dashboard/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── errors/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── pull-requests/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── navbar.tsx
│   ├── ui/ (shadcn components)
│   └── shared/
│       ├── status-badge.tsx
│       ├── severity-badge.tsx
│       ├── empty-state.tsx
│       ├── page-skeleton.tsx
│       └── install-guide.tsx
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   └── utils.ts
├── hooks/
│   ├── use-errors.ts
│   ├── use-stats.ts
│   └── use-realtime.ts
├── store/
│   └── app.store.ts
└── types/
    └── index.ts
```

## Features

### Authentication
- Login with email/password
- Registration with organization creation
- JWT token management with auto-refresh
- Protected routes

### Dashboard Overview
- Stats cards (total errors, fixes/month, success rate, fixes left)
- Timeline chart (errors vs fixes over 30 days)
- Recent errors table
- Most frequent errors list

### Errors Management
- Filterable errors list (status, severity, search)
- Error detail page with:
  - Stack trace viewer
  - AI-generated fix diff
  - Fix status progress
  - Pull request information
  - AI explanation

### Pull Requests
- PR list with status filtering
- Confidence badges
- Test status indicators
- Stats overview

### Settings
- General settings (organization info, members)
- Project management (CRUD)
- API key management (create, revoke)
- Notification settings per project
- Usage & plan information

### Real-time Updates
- Socket.IO integration
- Live connection indicator
- Toast notifications for:
  - New errors received
  - Fixes ready
  - Fixes failed

## API Integration

The dashboard expects a backend API at `NEXT_PUBLIC_API_URL` with the following endpoints:

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Token refresh
- `GET /stats/overview` - Overview statistics
- `GET /stats/timeline` - Timeline data
- `GET /errors` - Errors list
- `GET /errors/:id` - Error detail
- `PATCH /errors/:id/ignore` - Ignore error
- `GET /pull-requests` - Pull requests list
- `GET /projects` - Projects list
- `POST /projects` - Create project
- `DELETE /projects/:id` - Delete project
- `GET /api-keys` - API keys list
- `POST /api-keys` - Create API key
- `DELETE /api-keys/:id` - Revoke API key
- `POST /notifications/test` - Test notification

## License

MIT
