# Security Guide

## Authentication & Authorization

### JWT Security
- JWTs are signed with a secret key stored in `AUTH_SECRET`
- Session maxAge is 8 hours
- Tokens are refreshed on each request
- Never store sensitive data in JWT payload

### Permission Checks
All protected routes must verify permissions:

```typescript
import { hasRequiredPermissions } from '@/lib/security';

export async function DELETE(request: Request) {
  const session = await auth();
  
  if (!hasRequiredPermissions(session, ['user.delete'])) {
    throw new ForbiddenError('Insufficient permissions');
  }
  
  // Proceed with deletion
}
```

### Role Hierarchy
- SUPER_ADMIN: Bypasses all restrictions except org isolation
- ADMIN: Bypasses most restrictions except org isolation
- Other roles: Subject to permission checks

## Organization Isolation

### Multi-tenant Security
Every query must include organization filter:

```typescript
// ✅ Good
const data = await prisma.shipment.findMany({
  where: {
    organizationId: session.user.organizationId,
  },
});

// ❌ Bad - Missing org filter
const data = await prisma.shipment.findMany();
```

### Middleware Validation
Organization isolation is enforced at middleware level:

```typescript
import { verifyOrganizationIsolation } from '@/lib/security';

export async function GET(request: Request) {
  const session = await auth();
  const orgId = request.nextUrl.searchParams.get('orgId');
  
  if (!verifyOrganizationIsolation(session, orgId)) {
    throw new ForbiddenError('Cannot access this organization');
  }
}
```

## Data Protection

### Sensitive Data Handling
- Never log passwords, tokens, or PII
- Use redaction in logs:

```typescript
logger.info('User login', {
  userId: user.id,
  email: redactEmail(user.email),
});
```

### Error Messages
- Never expose internal error details to clients
- Use generic messages in production:

```typescript
// ✅ Good
if (isDev) {
  return { error: error.message };
} else {
  return { error: 'An error occurred' };
}
```

### Environment Variables
- Store secrets in `.env.local` (never commit)
- Use `validateEnv()` to ensure all required vars are set
- Prefix sensitive vars with underscore to prevent exposure

## API Security

### Input Validation
All API inputs must be validated with Zod:

```typescript
import { LoginRequestSchema } from '@/types/dto';

export async function POST(request: Request) {
  const data = await request.json();
  const validated = LoginRequestSchema.parse(data);
  // Proceed with validated data
}
```

### Rate Limiting
Consider rate limiting for sensitive endpoints:
- Login attempts: 5 per minute per IP
- API calls: 100 per minute per user
- File uploads: 10 per hour per user

### CORS
CORS is configured in `next.config.ts`:
- Only allow trusted origins
- Credentials are included in requests
- Preflight requests are handled

## Audit Logging

### What to Log
- Authentication events (login, logout, failed attempts)
- Authorization failures (permission denied)
- Data modifications (create, update, delete)
- Sensitive operations (exports, bulk actions)

### How to Log
```typescript
import { createAuditLog } from '@/services/audit';

await createAuditLog({
  userId: session.user.id,
  action: 'DELETE',
  entity: 'User',
  entityId: userId,
  metadata: { reason: 'Account closure' },
});
```

### Audit Trail Preservation
- Audit logs are never deleted (soft delete only)
- Includes timestamp, user, action, and metadata
- Supports compliance requirements

## Database Security

### Query Injection Prevention
Always use Prisma (never raw SQL):

```typescript
// ✅ Good - Parameterized
const user = await prisma.user.findUnique({
  where: { email: userInput },
});

// ❌ Bad - SQL injection risk
const user = await prisma.$queryRaw`SELECT * FROM User WHERE email = ${userInput}`;
```

### Soft Deletes
Use soft deletes to preserve audit trail:

```typescript
// Soft delete
await prisma.user.update({
  where: { id: userId },
  data: { deletedAt: new Date() },
});

// Query excludes soft-deleted
const users = await findManyActive('user');
```

## Session Security

### Session Storage
- Sessions are stored in database via Prisma adapter
- JWT tokens are signed and verified
- Session data is minimal (only user ID and roles)

### Session Expiry
- Sessions expire after 8 hours
- Expired sessions require re-authentication
- Logout immediately invalidates session

### CSRF Protection
- CSRF tokens are automatically handled by Next.js
- All state-changing requests use POST/PUT/DELETE
- Tokens are validated server-side

## Secrets Management

### Environment Variables
```bash
# .env.local (never commit)
AUTH_SECRET=your-secret-key
DATABASE_URL=postgresql://...
PRISMA_ACCELERATE_URL=...
```

### Secret Rotation
- Rotate AUTH_SECRET periodically
- Update database credentials quarterly
- Monitor for unauthorized access

## Compliance

### GDPR
- User data can be exported
- User data can be deleted (soft delete)
- Audit logs are retained for compliance

### SOC 2
- All access is logged
- Permissions are enforced
- Errors are handled securely
- Data is encrypted in transit (HTTPS)

## Security Checklist

- [ ] All routes have permission checks
- [ ] Organization isolation is enforced
- [ ] Sensitive data is not logged
- [ ] Errors don't expose internal details
- [ ] Environment variables are not exposed
- [ ] CSRF protection is enabled
- [ ] Rate limiting is considered
- [ ] Audit logging is in place
- [ ] Database queries use Prisma
- [ ] Input validation uses Zod
- [ ] Sessions expire properly
- [ ] Soft deletes preserve audit trail

## Incident Response

### Security Incident
1. Immediately revoke compromised credentials
2. Review audit logs for unauthorized access
3. Notify affected users
4. Update security measures
5. Document incident and response

### Data Breach
1. Assess scope of breach
2. Notify users and authorities
3. Preserve evidence
4. Implement remediation
5. Update security policies

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Auth.js Security](https://authjs.dev/concepts/security)
- [Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
