<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:anchored-summary -->
## Goal
Transform existing SIFEX Courier ERP into enterprise logistics ERP with centralized Workflow Engine connecting all modules.

## Constraints & Preferences
- DO NOT redesign the application, create new pages, create placeholder pages, generate demo UI, hardcode anything, or simplify the workflow.
- KEEP ALL EXISTING MODULES — every module has its own workflow and performs only its own responsibilities.
- Every action must automatically trigger the next department. No duplicate shipment records — one shipment, one timeline, one workflow.
- All reports, dashboards, widgets, charts, KPIs must query real database data.
- Every action must create an audit log. No module should directly manipulate statuses outside the Workflow Engine.

## Progress
### Done
- Phase 1: Core workflow engine, definitions, notification service, timeline component, dashboard APIs, reports, module pages
- Phase 2.1: Enterprise Shipment Timeline — enhanced `ShipmentTimeline` Prisma model with `workflowStage`, `oldStatus`, `newStatus`, `action`, `departmentId`, `branchId`, `notes` fields; workflow engine now populates all rich fields on every transition
- Phase 2.2: Workflow Progress Engine — created `lib/workflow-progress/index.ts` service with `getWorkflowProgress()` that computes completed/current/pending stages with completion times, department, and user; created `/api/workflow-progress` endpoint; updated `WorkflowProgress.tsx` component with real-time subscription
- Phase 2.3: Smart Quick Action Engine — enhanced `lib/workflow-engine/actions.ts` with `getAvailableActionsForEntity()` that fetches entity status and user permissions from DB; added business rule filtering; created `lib/permission-actions/index.ts` with `getPermissionActions()` that combines permission + workflow stage + status + business rules
- Phase 2.4: Department Notification Engine — enhanced `lib/notifications/index.ts` with priority mapping (`EVENT_PRIORITY_MAP`), `createMany` batch insert, real-time Ably push via `notifyUser()`, richer metadata including department codes
- Phase 2.5: Delivery Task Management — refactored `app/workspace/delivery/page.tsx` with full Delivery Task workflow (WAITING_ASSIGNMENT → ASSIGNED → STARTED → ARRIVED → DELIVERED → COMPLETED), task-centric UI with customer/invoice/address info, rider change, real-time queue subscription
- Phase 2.6: Permission Action Engine — created `lib/permission-actions/index.ts` with `getPermissionActions()` that filters by permission, workflow stage, status, and business rules
- Phase 2.7: Live KPI Engine — created `lib/kpi-engine/index.ts` with `getLiveKPIs()` computing 15 KPIs from real DB data (export/import/warehouse today, revenue, outstanding, delivery stats, average processing times, success rate, SLA); created `/api/kpi` endpoint; added `publishToKpiChannel()` to realtime publisher; added KPI channel to realtime channels
- Phase 2.8: Enterprise Reporting — already exists at `app/api/reports/route.ts` with 10 report types, all querying real data with date range/customer/branch/station filters
- Phase 2.9: Operational Analytics — already exists at `app/api/analytics/route.ts`
- Phase 2.10: Realtime Workflow Intelligence — enhanced realtime infrastructure: added KPI channel, workflow queue channels per module, notification push per user; created `hooks/useRealtimeSubscription.ts` with `useKpiSubscription()`, `useDashboardSubscription()`, `useNotificationSubscription()`, `useWorkflowQueueSubscription()`, `useEntitySubscription()`
- Audit Engine — enhanced `services/audit.ts` with `departmentId`, `workflowStage`, `oldStatus`, `newStatus`, `device`, `browser` fields; enhanced `AuditLog` Prisma model with same fields and indexes
- Prisma schema: added rich fields to `ShipmentTimeline` and `AuditLog`; pushed to DB; regenerated Prisma client
- TypeScript compiles with `tsc --noEmit` — zero errors

### In Progress
- (none)

### Blocked
- (none)

### Bug Fixes & Enhancements
- Fixed demo API (`demo-api.mjs`) HAWB creation — added `freight`, `freightRate`, `chargeableWeight` fields
- Fixed billing Phase 5b workflow to properly mark PAID on payment confirmation
- Fixed `lib/auth.ts` session callback — populates `permissions` from DB for workflow permission checks
- Added `customs.broker` permission to DB seed
- Fixed `app/api/dashboard/import/route.ts` raw SQL column name `workflow_status` → `workflowStatus`
- Created `app/api/ably/auth/route.ts` — Ably token authentication endpoint for realtime subscriptions
- Seeded HKG warehouse zones and storage locations
- Fixed `app/api/warehouse/zones/route.ts` — fallback to user's station when no branch context
- Fixed `app/api/workflow/route.ts` — passes `locationId` into metadata for warehouse side effects
- Fixed ASSIGN_SHELF persistence in `lib/workflow-engine/index.ts` — correctly assigns shelf and updates MAWB
- Fixed MAWB detail page banner to show correct import module name (not EXPORT)
- Set signature PIN for admin user
- Fixed `app/api/payments/confirm/[id]/route.ts` — triggers workflow transition on payment confirm
- Fixed invoice product line to show cargo description with tracking numbers
- Updated `app/api/billing/[id]/route.ts` to include HAWB description and trackingNumber

### UI & UX Improvements
- **Profile page** (`app/workspace/profile/page.tsx`): Email field is now editable (removed `disabled`); PATCH `/api/users/[id]` now accepts `email` field
- **Customers page** (`app/workspace/customers/page.tsx`): Added inline edit dialog — click any customer row to edit name, email, phone, address, city, country, and active status. Integrates with existing PATCH `/api/customers/[id]` API

### Phase 3.3 — Enterprise Import Operations
- Extended `ImportWorkflowStatus` enum with 16 statuses: PRE_ARRIVAL, TERMINAL_ARRIVED, MANIFEST_VERIFIED, MAWB_RECEIVED, RECEIVED, DOCUMENTS_VERIFIED, PIECES_VERIFIED, WEIGHT_VERIFIED, DAMAGE_INSPECTED, CUSTOMS_SUBMITTED, CUSTOMS_ASSESSED, CUSTOMS_PAID, CUSTOMS_INSPECTION, CUSTOMS_CLEARED, CUSTOMS_HOLD, EXCEPTION
- Full 16-status transition map in `lib/workflow-engine/definitions.ts` with dual verification paths (docs and pieces in either order), customs sub-workflow (7 sub-statuses), exception flow (entered from any physical status, resolved back to prior status), warehouse handover at CUSTOMS_CLEARED → WAREHOUSE_RECEIVING with side-effect to set workflowStage=WAREHOUSE
- Updated `MODULE_STATUS_MAP` with all new import statuses
- Updated `app/api/master-awbs/route.ts` scope=import to include all new statuses
- Updated `app/api/dashboard/import/route.ts` with 12 KPIs: preArrival, terminalArrived, pendingInspection, customsPending, readyForWarehouse, exceptionCount, customsHold, totalImport, releasedToday, manifestedCount, avgProcessingTime, receivedMonth
- Enhanced `app/workspace/import/page.tsx` with pipeline kanban view (6 columns: Pre-Arrival, Arriving, In Inspection, Customs, Ready for Warehouse, Exceptions), list view toggle, status-aware action buttons for every workflow step, report damage/missing dialogs, realtime queue subscription via `useWorkflowQueueSubscription`
- Created `app/workspace/import/[id]/page.tsx` — Import Operations Center with 6 tabs (Overview, Cargo, Documents, Customs, Timeline, Consignee), context-sensitive Quick Actions per status, confirmation dialogs, timeline display, customs clearance progress bar
- Updated `lib/notifications/index.ts` EVENT_PRIORITY_MAP with 7 new import events (IMPORT_PRE_ARRIVAL, IMPORT_ARRIVED, IMPORT_DAMAGE_REPORTED, IMPORT_MISSING_REPORTED, IMPORT_CUSTOMS_SUBMITTED, IMPORT_CUSTOMS_HOLD, IMPORT_CUSTOMS_CLEARED, IMPORT_EXCEPTION_RESOLVED)
- Updated `app/api/reports/route.ts` to use new split statuses instead of old VERIFIED
- TypeScript compiles with zero new errors

### Phase 4 — Enterprise Operations Platform
- All 12 new Prisma models added to `prisma/schema.prisma`: WorkQueue, WorkQueueItem, SLAConfig, SLATracker, Escalation, EscalationAction, BusinessRule, RuleExecutionLog, Assignment, AssignmentPreference, DocumentTemplate, Document, BackgroundJob
- Schema pushed (`prisma db push`) and client regenerated (`prisma generate`)
- `lib/queue-engine/index.ts`: Queue Engine with auto-enqueue on workflow transitions (20+ status → queue mappings), priority scoring (VIP/weight/dangerous goods), dequeue/getQueueItems/getDepartmentQueues/getQueueKpis/skipQueueItem
- `lib/sla-engine/index.ts`: SLA Engine with startSLATracking/completeSLATracking/checkSLAAlerts/getSLAStatus/getSLASummary/getSLAByModule; auto-creates escalations on SLA breach; warning threshold support
- `lib/escalation-engine/index.ts`: Escalation Engine with createEscalation/escalateToNextLevel (4 levels)/acknowledgeEscalation/resolveEscalation/getEscalations/getEscalationSummary
- `lib/rules-engine/index.ts`: Business Rules Engine with evaluateRules/evaluateConditions/executeActions/evaluateRulesForWorkflowTransition; supports ENQUEUE/ESCALATE/NOTIFY/SET_PRIORITY actions
- `lib/work-inbox/index.ts`: Work Inbox service aggregating queue items by queue type with SLA breach section
- `lib/assignment-engine/index.ts`: Assignment Engine with autoAssign (load-balanced)/reassign/acceptAssignment/rejectAssignment/startAssignment/completeAssignment/getLoadByDepartment
- `lib/document-engine/index.ts`: Document Engine with generateDocument/signDocument/getDocumentsForEntity/getDocumentStats
- `lib/job-engine/index.ts`: Background Job Engine with createJob/processNextJob/getJobStats/getJobsByType; supports retry with exponential backoff
- `app/api/queues/route.ts`, `app/api/sla/route.ts`, `app/api/escalations/route.ts`, `app/api/rules/route.ts`, `app/api/inbox/route.ts`, `app/api/assignments/route.ts`, `app/api/documents/route.ts`, `app/api/jobs/route.ts`: All 8 Phase 3 API routes implementing CRUD + actions
- `app/api/operations/route.ts`: Operations Dashboard API — aggregates queue/SLA/escalation/assignment/job/document stats with bottleneck detection
- `app/api/executive/route.ts`: Executive Command Center API — executive dashboard with active shipments/revenue/pending billing/SLA health/queue backlog KPIs + monthly performance trends
- Workflow Engine integration: `lib/workflow-engine/index.ts` now calls `enqueueEntity()` (queue engine), `startSLATracking()`/`completeSLATracking()` (SLA engine), and `evaluateRulesForWorkflowTransition()` (rules engine) on every workflow transition
- KPI Engine (`lib/kpi-engine/index.ts`) updated with 10 additional Phase 3 KPIs: queueBacklog, slaBreached/slaWarning/slaOnTrack, activeEscalations, activeAssignments, pendingJobs/failedJobs, totalDocuments, unassignedQueueItems
- Realtime infrastructure extended (`lib/realtime/channels.ts` + `lib/realtime/publisher.ts`): added SLA, Escalations, Assignments, Jobs, Operations, Executive channels with dedicated publisher functions; all engines publish real-time updates
- TypeScript compiles with `tsc --noEmit` — zero errors

## Key Decisions
- Added `workflowStatus` String field to MasterAWB and HouseAWB to track module-specific status (DRAFT, VALIDATED, HAWB_GENERATED, etc.) separately from cargo-level `cargoStatus` (INITIATED, ACCEPTED, RCS, etc.)
- Workflow Engine chains: Permission Validation → Workflow Validation → Prisma Transaction → Audit Log → Notifications → Realtime Updates → Side Effects
- Auto-invoice generation triggers when shipment enters WAREHOUSE storage step
- Cross-module transitions (e.g., DISPATCHED → RECEIVED) are defined in the target module's transition list; `findTransition` searches all definitions
- ShipmentTimeline enhanced with `departmentId`, `branchId`, `workflowStage`, `oldStatus`, `newStatus`, `action` for enterprise operational timeline tracking
- AuditLog enhanced with `departmentId`, `workflowStage`, `oldStatus`, `newStatus`, `device`, `browser` for compliance-grade audit trails
- Real-time KPI engine computes 15 operational KPIs from live DB data with Ably-based push on every workflow transition
- Realtime channels extended with KPI channel and per-module workflow queue channels for instant UI updates
- KPI Engine (`lib/kpi-engine/index.ts`) updated with Phase 3 KPIs: queueBacklog, slaBreached/slaWarning/slaOnTrack, activeEscalations, activeAssignments, pendingJobs/failedJobs, totalDocuments, unassignedQueueItems

## Next Steps
- Add navigation handlers for Warehouse/Billing/Delivery pages (PRINT_LABEL, PRINT_INVOICE, CONTACT_RIDER, etc.)
- Add side-effect actions for ASSIGN_SHELF, REPORT_DAMAGE, REPORT_MISSING in Import and Warehouse pages
- Verify real-time updates and notification delivery across modules
- Test end-to-end workflow: Export → Import → Warehouse → Billing → Delivery → Completed

## Critical Context
- TypeScript compiles with `tsc --noEmit` — known pre-existing errors in `features/auth/permissions.service.ts` and routes using `requirePermission` (NextMiddleware/Session type mismatch). No new errors from recent changes.
- Dev server restart required after adding/removing page directories.
- Cookie names in next-auth v5 beta (`@auth/core`) — `authjs.session-token` (http) / `__Secure-authjs.session-token` (https). The old v4 name `next-auth.session-token` is NOT used.
- Client-side `signOut({ callbackUrl })` does not work in next-auth v5 — the client passes `callbackUrl` but the server reads `redirectTo`. Use `/api/signout` custom route instead.
- Schema pushed with `prisma db push` (no migrations).
- `BillingRecord` has no direct Prisma relation to `HouseAWB` (houseAWBId is not unique); data fetched via separate query.
- `BillingRecord.customer` IS a proper Prisma relation — usable in `include`.
- `ExchangeRateSnapshot` model exists for exchange rate data.
- Hong Kong station ID: `d6d35225-96dc-46fb-b3dc-2a3a0efbad4b` (HKG).
- Guangzhou station ID: `680393ef-79f6-475d-b1db-703033d4c41e` (CAN).
- TCRA integration: `lib/tcra/` — outbox pattern with `tcra_outbox` DB table. Events automatically queued via event bus when cargo status changes (ACCEPTED → OT01, RCS → OT02, DELIVERED → OT04). Process pending events with `processPendingEvents()`. TCRA endpoint: `196.32.240.66:8000`. Our callback endpoint: `POST /api/tcra/callback`.
- TCRA event bus subscription (`subscribeToEvents()`) must be called at app startup — e.g. in a `lib/instrumentation.ts` or in the root layout import.
- `findTransition("DISPATCHED", "RECEIVE_SHIPMENT")` finds the cross-module transition defined in importTransitions.
- `updateStatus` now sets `workflowStatus` (fixed critical bug where the field was never saved).
- Existing records backfilled with `workflowStatus = 'DRAFT'`.
- Permission codes use dot notation (`export.approve`) matching the DB permissions table — not colons (`export:validate`).
- Workflow engine permission check uses `context.userPermissions` from JWT session first, falls back to DB query only when not provided.
- SUPER_ADMIN role has full permissions including `export.approve`, `house-awb.create`, `master-awb.update`, `manifests.create`, `flights.schedule`, `warehouse.dispatch`, `warehouse.receive`, `billing.payment`, `delivery.assign`.

## Relevant Files
- `lib/workflow-engine/types.ts`: Workflow types, enums (ExportWorkflowStatus, ImportWorkflowStatus, etc.), interfaces (WorkflowTransition, QuickAction, WorkflowDefinition)
- `lib/workflow-engine/definitions.ts`: All 5 module workflow definitions, status maps, cross-module transitions (DISPATCHED → RECEIVED), findTransition()
- `lib/workflow-engine/index.ts`: WorkflowEngine class with execute() — validates permission/finds transition/updates status/creates audit log/sends notifications/side effects
- `lib/notifications/index.ts`: sendCrossModuleNotification for event-driven cross-department alerts
- `app/api/workflow/route.ts`: Central workflow transition endpoint — POST for transitions, GET for allowed actions; handles null status (defaults to DRAFT)
- `app/api/master-awbs/[id]/route.ts`: MasterAWB PATCH integrates workflow engine for status transitions
- `app/api/master-awbs/route.ts`: MasterAWB list — scope=import includes DISPATCHED + IMPORT workflowStage
- `app/workspace/export/page.tsx`: Export page with QuickActionBar, dashboard widgets, workflow progress indicator, nav-aware handleQuickAction
- `app/workspace/import/page.tsx`: Import page with pipeline kanban (6 columns), list view, status-aware action buttons for all 16 import statuses, report damage/missing dialogs, realtime queue subscription
- `app/workspace/import/[id]/page.tsx`: Import Operations Center with 6 tabs (Overview, Cargo, Documents, Customs, Timeline, Consignee), context-sensitive Quick Actions, confirmation dialogs, customs clearance progress bar
- `app/workspace/warehouse/page.tsx`: Warehouse page with Awaiting/Stored/Billing tabs, ASSIGN_SHELF action
- `app/workspace/billing/page.tsx`: Billing page with RECEIVE_PAYMENT action via workflow API
- `app/workspace/delivery/page.tsx`: Delivery page with ASSIGN_RIDER, START_DELIVERY actions
- `components/cargo/ShipmentTimeline.tsx`: Timeline component with event icons, user/department/timestamp per event
- `prisma/schema.prisma`: workflowStatus on MasterAWB/HouseAWB, Notification model, WAITING_PAYMENT in BillingStatus
- `lib/tcra/`: TCRA integration module (types, client, signing, queue, events, snapshot)
<!-- END:anchored-summary -->
