# Circlify Management System

A comprehensive multi-tenant administrative management platform for churches, associations, clubs, and other membership-based organizations.

## Features

- **Member Management** - Comprehensive member database with attendance tracking
- **Financial Management** - Track income, expenses, liabilities, and budgets
- **Asset Management** - Manage organizational assets
- **Messaging** - Send targeted SMS communications
- **Event Management** - Calendar-based event planning with automated reminders
- **Dashboard & Analytics** - Real-time insights and reporting
- **Multi-tenant Architecture** - Complete data isolation between organizations
- **Dark/Light Mode** - Built-in theme support

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **UI Components:** shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth)
- **Security:** Row Level Security (RLS) for multi-tenancy
- **Forms:** react-hook-form with Zod validation
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Installation

1. **Clone the repository** (or navigate to the project directory)

```bash
cd circlify-cms
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy the example env file and update it with your Supabase credentials:

```bash
cp .env.local.example .env.local
```

The file should contain:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Set up the database**

Follow the instructions in `DATABASE_SETUP.md` to create all necessary tables, functions, triggers, and Row Level Security policies in your Supabase project.

5. **Run the development server**

```bash
npm run dev
```

6. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. Sign up for a new account
2. Create your organization
3. Start managing your organization!

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Authentication pages (signin, signup, etc.)
│   ├── (dashboard)/         # Protected dashboard routes
│   ├── (onboarding)/        # Organization setup flow
│   ├── auth/callback/       # OAuth callback handler
│   └── layout.tsx           # Root layout with theme provider
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Header, Sidebar components
│   ├── theme-provider.tsx   # Theme context provider
│   └── theme-toggle.tsx     # Theme switcher component
├── lib/
│   ├── supabase/            # Supabase client configurations
│   │   ├── client.ts        # Browser client
│   │   ├── server.ts        # Server client
│   │   ├── middleware.ts    # Middleware client
│   │   └── queries.ts       # Database queries
│   ├── utils/               # Utility functions
│   └── constants/           # App constants
├── types/
│   └── database.ts          # TypeScript type definitions
└── middleware.ts            # Next.js middleware for auth
```

## Key Features Explained

### Multi-Tenancy

The system uses a multi-tenant architecture where:
- Each organization is completely isolated
- Row Level Security (RLS) ensures data privacy
- Users can belong to multiple organizations
- Active organization is tracked in user sessions

### Authentication

- Email/password authentication
- Google OAuth support
- Password reset flow
- Protected routes with middleware
- Automatic user profile creation

### Theme System

- Light and dark mode support
- System preference detection
- Smooth transitions between themes
- Persisted user preferences

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features

1. Create new pages in the appropriate route group
2. Add database tables/policies in Supabase
3. Create TypeScript types in `src/types/`
4. Add queries in `src/lib/supabase/queries.ts`
5. Update navigation in `src/lib/constants/`

## Database Schema

The system uses four core tables:

- **organizations** - Stores tenant information
- **users** - Extends Supabase auth.users
- **organization_users** - Links users to organizations with roles
- **user_sessions** - Tracks active organization context

See `DATABASE_SETUP.md` for complete schema details.

## Security

- Row Level Security (RLS) on all tables
- Protected routes via middleware
- Secure session management
- Data isolation between tenants
- Input validation with Zod schemas

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Digital Ocean App Platform
- AWS Amplify

## Troubleshooting

### Database Connection Issues

- Verify your Supabase URL and anon key
- Check that RLS policies are properly set up
- Ensure tables exist in your database

### Authentication Not Working

- Confirm environment variables are set
- Check Supabase Auth settings
- Verify email templates are configured
- For OAuth, ensure redirect URLs are configured

### Build Errors

- Delete `.next` folder and `node_modules`
- Run `npm install` again
- Check for TypeScript errors with `npm run build`

## Contributing

This is a private project. If you have access and want to contribute:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

All rights reserved.

## Support

For issues or questions, please contact the development team.

## Roadmap

Phase 1 (Current):
- ✅ Project setup and infrastructure
- ✅ Multi-tenant architecture
- ✅ Authentication system
- ✅ Dashboard with theme support

Phase 2 (Upcoming):
- Members management module
- Financial management module
- Asset tracking module

Phase 3:
- Messaging module
- Events management module
- Reports and analytics

Phase 4:
- Advanced features and optimizations
- Mobile app consideration
- Additional integrations
