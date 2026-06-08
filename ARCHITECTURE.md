# Enterprise Folder Architecture

This document outlines the folder structure and architectural decisions for the Sifex Air Cargo ERP system.

## Architecture Principles

- **Feature-based modules**: Each business domain is isolated in its own feature folder
- **Clean architecture**: Separation of concerns with clear boundaries
- **Scalability**: Easy to extract features into microservices later
- **Maintainability**: Consistent patterns across all features
- **Type safety**: TypeScript everywhere with strict mode

## Folder Structure

```
sifex/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes group
│   ├── (workspace)/              # Protected workspace routes
│   ├── api/                      # API route handlers
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
│
├── features/                     # Feature modules (business domains)
│   ├── auth/                     # Authentication & authorization
│   ├── export/                   # Export operations
│   ├── import/                   # Import operations
│   ├── warehouse/                # Warehouse management
│   ├── billing/                  # Billing & invoicing
│   ├── delivery/                 # Delivery & riders
│   ├── customers/                # Customer management
│   ├── hr/                       # HR & attendance
│   ├── procurement/              # Procurement
│   ├── reports/                  # Analytics & reporting
│   └── settings/                 # System settings
│   
│   Each feature contains:
│   ├── components/               # Feature-specific components
│   ├── hooks/                    # Feature-specific hooks
│   ├── services/                 # Business logic & API calls
│   ├── types/                    # Feature-specific types
│   └── utils/                    # Feature-specific utilities
│
├── components/                   # Shared components
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Layout components (Sidebar, Topbar, etc.)
│   └── common/                   # Reusable business components
│
├── lib/                          # Core utilities
│   ├── prisma.ts                 # Prisma client singleton
│   ├── utils.ts                  # General utilities (cn, etc.)
│   ├── auth.ts                   # Auth utilities
│   └── validation.ts             # Zod schemas
│
├── hooks/                        # Global custom hooks
│   ├── use-auth.ts               # Authentication hook
│   ├── use-permissions.ts        # Permission checking hook
│   └── use-theme.ts              # Theme management hook
│
├── types/                        # Global TypeScript types
│   ├── api/                      # API request/response types
│   ├── models/                   # Database model types
│   └── index.ts                  # Type exports
│
├── services/                     # Global services
│   ├── api-client.ts             # API client wrapper
│   ├── audit-logger.ts           # Audit logging service
│   └── error-handler.ts          # Error handling service
│
├── middleware/                   # Middleware functions
│   ├── auth.ts                   # Authentication middleware
│   ├── permissions.ts            # Permission checking middleware
│   └── audit.ts                  # Audit logging middleware
│
├── config/                       # Configuration files
│   ├── permissions.ts            # Permission definitions
│   ├── roles.ts                  # Role definitions
│   └── modules.ts                # Module configurations
│
├── prisma/                       # Prisma ORM
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Database migrations
│
└── public/                       # Static assets
```

## Module Communication

- Features communicate through services
- Shared state managed via Zustand stores
- Server state managed via TanStack Query
- Type-safe API contracts using Zod

## Naming Conventions

- **Files**: kebab-case (e.g., `user-profile.tsx`)
- **Components**: PascalCase (e.g., `UserProfile`)
- **Functions**: camelCase (e.g., `getUserProfile`)
- **Types**: PascalCase (e.g., `UserProfile`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)

## Import Aliases

- `@/*` - Root directory
- `@/components/*` - Shared components
- `@/features/*` - Feature modules
- `@/lib/*` - Core utilities
- `@/hooks/*` - Global hooks
- `@/types/*` - Global types
- `@/services/*` - Global services

## Future Migration Path

Each feature folder is designed to be extracted into a NestJS microservice:
- `services/` → NestJS services
- `types/` → Shared DTOs
- `components/` → Remain in frontend
- API routes → NestJS controllers
