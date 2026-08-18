# Login Failure Root Cause Analysis

## File: `lib/auth.ts`

### What It Does

Configures Auth.js v5 with a Credentials provider, Prisma adapter, and JWT session strategy. Defines three callbacks: `authorize`, `jwt`, and `session` — which together form the complete authentication pipeline.

---

### Role in the Auth Flow

| Callback | When It Runs | What It Does |
|---|---|---|
| `authorize()` | On login POST | Validates credentials, queries DB, returns user object |
| `jwt()` | On token create & refresh | Controls what goes into the JWT cookie |
| `session()` | On every `auth()` call | Enriches the session object with user data |

---

### Bug #1: N+1 SQL Queries in `session` Callback

**Location**: Lines 119–130 (old code)

**Severity**: Critical

**The Code**:
```typescript
prisma.userRole.findMany({
  where: { userId: uid },
  include: {
    role: {
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    },
  },
});
```

**Why It Is Wrong**: Prisma translates each `include` level into a separate SQL query. A 4-level-deep include generates:

```
  1 query:  SELECT * FROM user_roles WHERE user_id = ?
+ 1 query:  SELECT * FROM roles WHERE id = ?
+ 1 query:  SELECT * FROM role_permissions WHERE role_id = ?
+ N queries: SELECT * FROM permissions WHERE id IN (?, ?, ...)
  ──────────────────────────────────────────────────
  = 3 + N total queries
```

For a SUPER_ADMIN with 96 permissions: **99 SQL queries per `auth()` call**.

The session callback runs at least twice per page load (server render + client `getSession()`), producing **~200 queries per navigation**.

**Why It Causes `ClientFetchError`**: These 100+ queries exhaust the database connection pool under concurrent requests. Subsequent requests hang waiting for a connection. The browser's `fetch()` eventually times out and throws **"Failed to fetch"**.

---

### Bug #2: `Promise.all` Blocks on Any Failure

**Location**: Lines 104–135 (old code)

**Severity**: Critical

**The Code**:
```typescript
const [dbUser, userRoles, userStations] = await Promise.all([...]);
```

**Why It Is Wrong**: `Promise.all` settles when **all** promises settle — or rejects immediately if **any** rejects. If the slow `userRoles` query (99 SQL calls) hangs, the profile and station queries are held hostage. The entire `auth()` call blocks, the HTTP response never arrives, and the browser throws `ClientFetchError`.

---

### Bug #3: Empty Strings Instead of Null on Fallback

**Location**: Lines 158–159 (old code)

**Severity**: Low

**The Code**:
```typescript
session.user.email = "";
session.user.name = "";
```

**Why It Is Wrong**: Empty strings are **truthy** in JavaScript. Client code checking `if (session?.user?.email)` would pass for a user who failed to load, masking the error condition.

---

### Bug #4: `token.role` May Be Undefined

**Location**: Line 101 (old code)

**Severity**: Low

**The Code**:
```typescript
session.user.role = token.role as string | null;
```

**Why It Is Wrong**: `token.role` is typed `string | null | undefined`. The cast `as string | null` does not convert `undefined` to `null`. If `token.role` is `undefined`, `session.user.role` becomes `undefined` instead of `null`, causing inconsistent checks downstream.

---

### Fix Applied

| Problem | Resolution |
|---|---|
| N+1 queries from deep `include` | Replaced with flat batched queries: first fetch role IDs, then a single `rolePermission.findMany({ where: { roleId: { in: roleIds } } })`. **2 queries total**, regardless of permission count. |
| `Promise.all` hangs on slow query | Replaced with `Promise.allSettled`. Each result is checked independently — a slow station query cannot block roles or profile. |
| Empty strings on fallback | Removed explicit fallback values. Each field is set only when the corresponding query succeeds; otherwise left `undefined`. |
| `token.role` undefined cast | Changed to `(token.role as string \| null) ?? null` to normalize `undefined` to `null`. |

**Before**: `session callback making 99+ SQL queries per call`  
**After**: `session callback making exactly 4 queries total (1 profile + 2 roles/permissions + 1 stations)`
