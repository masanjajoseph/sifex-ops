# Development Guide

## Project Structure

```
sifex/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth routes (grouped)
│   ├── (workspace)/       # Workspace routes (grouped)
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── workspace/        # Workspace-specific components
├── features/            # Feature modules
│   ├── auth/
│   ├── warehouse/
│   └── ...
├── lib/                 # Utilities and helpers
│   ├── auth.ts         # Auth configuration
│   ├── security.ts     # Security utilities
│   ├── resilience.ts   # Error handling
│   ├── db-helpers.ts   # Database utilities
│   └── ...
├── middleware/         # Next.js middleware
├── types/             # TypeScript types
│   ├── domain.ts      # Domain types
│   ├── dto.ts         # Data transfer objects
│   └── ...
├── config/            # Configuration
├── services/          # Business logic services
└── prisma/           # Database schema
```

## Naming Conventions

### Files
- Components: PascalCase (e.g., `UserCard.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Types: camelCase (e.g., `user.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)

### Functions
- Hooks: `use*` prefix (e.g., `usePermissions`)
- Utilities: descriptive verb (e.g., `formatDate`, `validateEmail`)
- Handlers: `handle*` prefix (e.g., `handleSubmit`)

### Variables
- Constants: UPPER_SNAKE_CASE
- Regular: camelCase
- Booleans: `is*` or `has*` prefix (e.g., `isActive`, `hasPermission`)

## Import Organization

```typescript
// 1. External packages
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal absolute imports
import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/utils';

// 3. Relative imports (if necessary)
import { helper } from './helper';
```

## Type Safety

### Always use types
```typescript
// ❌ Bad
const user: any = {};

// ✅ Good
import { AuthUser } from '@/types/domain';
const user: AuthUser = { ... };
```

### Use DTOs for API contracts
```typescript
// ✅ Good
import { LoginRequest, LoginRequestSchema } from '@/types/dto';

export async function login(data: LoginRequest) {
  const validated = LoginRequestSchema.parse(data);
  // ...
}
```

### Generic components
```typescript
// ✅ Good
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
}

export function DataTable<T>({ columns, data }: DataTableProps<T>) {
  // ...
}
```

## Security Practices

### Always validate permissions
```typescript
import { hasRequiredPermissions } from '@/lib/security';

export async function deleteUser(userId: string, session: Session) {
  if (!hasRequiredPermissions(session, ['user.delete'])) {
    throw new ForbiddenError('Cannot delete users');
  }
  // ...
}
```

### Verify organization isolation
```typescript
import { verifyOrganizationIsolation } from '@/lib/security';

export async function getOrgData(orgId: string, session: Session) {
  if (!verifyOrganizationIsolation(session, orgId)) {
    throw new ForbiddenError('Cannot access this organization');
  }
  // ...
}
```

### Use safe error handling
```typescript
import { handleApiError, ValidationError } from '@/lib/resilience';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // ...
  } catch (error) {
    return handleApiError(error);
  }
}
```

## Database Operations

### Use pagination helpers
```typescript
import { paginate } from '@/lib/db-helpers';

export async function getUsers(page: number, pageSize: number) {
  return paginate(
    (skip, take) => prisma.user.findMany({ skip, take }),
    () => prisma.user.count(),
    page,
    pageSize
  );
}
```

### Use transactions for multi-step operations
```typescript
import { withTransaction } from '@/lib/db-helpers';

export async function createUserWithRole(user: UserData, roleId: string) {
  return withTransaction(async (tx) => {
    const newUser = await tx.user.create({ data: user });
    await tx.userRole.create({
      data: { userId: newUser.id, roleId },
    });
    return newUser;
  });
}
```

### Filter soft-deleted records
```typescript
import { findManyActive } from '@/lib/db-helpers';

export async function getActiveUsers() {
  return findManyActive('user', {}, { orderBy: { createdAt: 'desc' } });
}
```

## Component Development

### Server components by default
```typescript
// ✅ Good - Server component
export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await getUser(params.id);
  return <UserProfile user={user} />;
}
```

### Client components for interactivity
```typescript
// ✅ Good - Client component
'use client';

export function UserForm() {
  const [isLoading, setIsLoading] = useState(false);
  // ...
}
```

### Prop drilling prevention
```typescript
// ✅ Good - Use context for deeply nested props
const PermissionContext = createContext<PermissionContext | null>(null);

export function usePermissionContext() {
  const context = useContext(PermissionContext);
  if (!context) throw new Error('Must be used within PermissionProvider');
  return context;
}
```

## Testing

### Test structure
```
features/
├── auth/
│   ├── __tests__/
│   │   ├── login.test.ts
│   │   └── permissions.test.ts
│   └── components/
```

### Test utilities
```typescript
import { createMockSession } from '@/lib/test-utils';

describe('UserPage', () => {
  it('should show delete button for admins', () => {
    const session = createMockSession({ roles: ['ADMIN'] });
    // ...
  });
});
```

## Debugging

### Use structured logging
```typescript
import { logger } from '@/lib/logger';

logger.info('User login', { userId, timestamp: new Date() });
logger.error('Database error', error, 'UserService');
```

### Use React DevTools
- Install React DevTools browser extension
- Inspect component props and state
- Profile performance

### Use Next.js DevTools
- Check server/client component boundaries
- Monitor API routes
- View build analysis

## Performance Checklist

- [ ] No unnecessary re-renders (use React.memo, useMemo)
- [ ] Images are optimized (use next/image)
- [ ] Fonts are optimized (use next/font)
- [ ] Code splitting is used (dynamic imports)
- [ ] Bundle size is monitored
- [ ] Database queries are indexed
- [ ] N+1 queries are avoided
- [ ] Pagination is implemented for large datasets

## Security Checklist

- [ ] All routes have permission checks
- [ ] Organization isolation is enforced
- [ ] Sensitive data is not logged
- [ ] Errors don't expose internal details
- [ ] Environment variables are not exposed
- [ ] CSRF protection is enabled
- [ ] Rate limiting is considered
- [ ] Audit logging is in place
