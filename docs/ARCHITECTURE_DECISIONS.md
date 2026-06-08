# Architecture Decision Records (ADRs)

## ADR-001: Auth Strategy

**Decision**: Use Auth.js v5 with JWT strategy and Prisma adapter

**Rationale**:
- Industry standard for Next.js applications
- Supports multiple providers (credentials, OAuth)
- JWT allows stateless authentication
- Prisma adapter provides database flexibility

**Consequences**:
- Session data must be kept minimal (JWT size limits)
- Permissions must be refreshed on token expiry
- Requires secure secret management

---

## ADR-002: Permission Model

**Decision**: Role-Based Access Control (RBAC) with permission inheritance

**Rationale**:
- Scales better than ACL for enterprise systems
- Roles can be composed and reused
- Permissions are granular and auditable

**Consequences**:
- Requires role hierarchy management
- Permission checks must be consistent across app
- Audit logging is critical

---

## ADR-003: Organization Isolation

**Decision**: Enforce organization isolation at middleware and query level

**Rationale**:
- Multi-tenant security requirement
- Prevents cross-organization data leaks
- Enables future SaaS scaling

**Consequences**:
- Every query must include org filter
- Middleware must validate org access
- Testing must cover org boundaries

---

## ADR-004: Error Handling

**Decision**: Centralized error classes with safe serialization

**Rationale**:
- Consistent error responses across API
- Prevents information leakage in production
- Enables proper HTTP status codes

**Consequences**:
- All errors must use AppError hierarchy
- Error details only in development
- Audit logging required for security errors

---

## ADR-005: Database Transactions

**Decision**: Use Prisma transactions for multi-step operations

**Rationale**:
- Ensures data consistency
- Prevents partial updates
- Simplifies error handling

**Consequences**:
- Transactions must be short-lived
- Nested transactions not supported
- Requires careful error handling

---

## ADR-006: Soft Deletes

**Decision**: Use soft deletes for audit trail preservation

**Rationale**:
- Maintains audit history
- Allows data recovery
- Supports compliance requirements

**Consequences**:
- All queries must filter deleted records
- Requires deletedAt index
- Complicates unique constraints

---

## ADR-007: Component Architecture

**Decision**: Separate UI components into reusable, composable pieces

**Rationale**:
- Enables consistent design system
- Reduces code duplication
- Improves maintainability

**Consequences**:
- Components must be generic
- Props drilling may occur
- Requires design system discipline

---

## ADR-008: Server vs Client Components

**Decision**: Default to server components, use client only when necessary

**Rationale**:
- Reduces JavaScript bundle size
- Improves security (no secrets in client)
- Better performance

**Consequences**:
- Limited interactivity in server components
- Must use client components for forms
- Requires careful boundary management

---

## ADR-009: Offline Storage

**Decision**: Use IndexedDB for offline-first capabilities

**Rationale**:
- Enables warehouse/delivery workflows offline
- Provides sync queue for later reconciliation
- Better UX than complete offline failure

**Consequences**:
- Requires sync logic
- Data consistency challenges
- Browser storage limitations

---

## ADR-010: Logging Strategy

**Decision**: Structured logging with context propagation

**Rationale**:
- Enables log aggregation and analysis
- Supports debugging and monitoring
- Audit trail for compliance

**Consequences**:
- All operations must log
- Sensitive data must be redacted
- Requires log storage infrastructure
