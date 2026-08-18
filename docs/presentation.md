# Sifex Air Cargo — Presentation Guide

## Mada za Presentation

1. **Utangulizi** — Sifex Air Cargo ni nini
2. **Login & Usability** — Enterprise na Customer portals
3. **Export Operations** — End-to-end shipment workflow
4. **Import Operations** — Clearance, inspection, customs
5. **Warehouse** — Receiving, storage, inventory
6. **Billing** — Invoicing, payment tracking
7. **Delivery** — Rider assignment, live tracking
8. **Customer Portal** — Self-service tracking na documents
9. **Reports & Analytics** — Real-time KPIs, operational reports
10. **Realtime Intelligence** — Live updates, queue engine, SLA monitoring
11. **Admin & System** — User management, roles, TCRA integration

---

## Kabla ya Presentation — Setup Demo Data

Piga curl hizi zote kabla ya kuanza presentation:

### 1. Login kama SUPER_ADMIN kupata session cookie

```bash
# Step 1: Get CSRF token
curl -s http://localhost:3000/api/auth/csrf -c /tmp/sifex_cookies.txt -b /tmp/sifex_cookies.txt

# Step 2: Login (password inaweza kuwa tofauti — angalia .env kwa SUPERUSER_PASSWORD)
curl -s -X POST "http://localhost:3000/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@sifex.com&password=Sifex@Admin2025!&csrfToken=<csrfToken from step 1>" \
  -b /tmp/sifex_cookies.txt -c /tmp/sifex_cookies.txt

# Verify:
curl -s http://localhost:3000/api/me -b /tmp/sifex_cookies.txt | python3 -m json.tool | head -10
```

**Kumbuka:** Stations (11), Airlines (9), na admin user zipo tayari baada ya seed. Angalia IDs zao:

```bash
# Get station IDs
curl -s http://localhost:3000/api/stations -b /tmp/sifex_cookies.txt | python3 -m json.tool

# Get airline IDs
curl -s http://localhost:3000/api/airlines -b /tmp/sifex_cookies.txt | python3 -m json.tool
```

**Station IDs (kutoka seed):**
- CAN (Guangzhou): `680393ef-79f6-475d-b1db-703033d4c41e`
- HKG (Hong Kong): `d6d35225-96dc-46fb-b3dc-2a3a0efbad4b`
- DAR (Dar es Salaam): `74603083-cf51-4209-a976-9429fa414461`
- NBO (Nairobi): `a7f10e63-4f26-42d0-8985-869624bc5ba0`

**Airline IDs (kutoka seed):**
- ET (Ethiopian): `e8a5238b-f4cf-4c3b-a602-142b64c9c4f7`
- TK (Turkish): `a74ca9b5-fc30-442d-a276-184406654df7`
- QR (Qatar): `33141885-4ac8-4268-afd7-72c620ac7fda`

### 2. Create Customers

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "type": "COMPANY",
    "name": "Tanzania Pharma Ltd",
    "code": "TPH-001",
    "email": "info@tanzaniapharma.co.tz",
    "phone": "+255712345678",
    "address": "Plot 123, Bagamoyo Road",
    "city": "Dar es Salaam",
    "country": "Tanzania",
    "contactPerson": "John Mwangi",
    "contactPhone": "+255712345679",
    "registrationNo": "REG-2024-001",
    "creditLimit": 50000,
    "paymentTerms": "NET30"
  }'

curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "type": "COMPANY",
    "name": "JN Textiles (T) Ltd",
    "code": "JNT-002",
    "email": "orders@jntextiles.co.tz",
    "phone": "+255765432109",
    "address": "456 Mkwepu Street",
    "city": "Dar es Salaam",
    "country": "Tanzania",
    "contactPerson": "Amina Hassan",
    "contactPhone": "+255765432100",
    "registrationNo": "REG-2024-002",
    "creditLimit": 75000,
    "paymentTerms": "NET15"
  }'

curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "type": "INDIVIDUAL",
    "name": "David Kamau",
    "code": "DK-003",
    "email": "dkamau@gmail.com",
    "phone": "+255623456789",
    "address": "789 Kenyatta Road",
    "city": "Arusha",
    "country": "Tanzania",
    "contactPerson": "David Kamau",
    "contactPhone": "+255623456789",
    "paymentTerms": "CASH"
  }'
```

### 3. Create Master AWBs (Export shipments)

```bash
# Export MAWB 1 — DRAFT status
curl -X POST http://localhost:3000/api/master-awbs \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "awbNumber": "071-12345678",
    "trackingNumber": "SIF-EXP-001",
    "shipmentType": "CAN_GUANGZHOU",
    "paymentMode": "PP",
    "currency": "USD",
    "customsValue": 25000,
    "originStationId": "680393ef-79f6-475d-b1db-703033d4c41e",
    "destinationStationId": "d6d35225-96dc-46fb-b3dc-2a3a0efbad4b",
    "senderName": "China Electronics Ltd",
    "senderCompany": "China Electronics Ltd",
    "senderAddress": "88 Tianhe Road, Guangzhou",
    "senderPhone": "+862012345678",
    "senderCity": "Guangzhou",
    "senderCountry": "China",
    "receiverName": "Tanzania Pharma Ltd",
    "receiverCompany": "Tanzania Pharma Ltd",
    "receiverAddress": "Plot 123, Bagamoyo Road",
    "receiverPhone": "+255712345678",
    "receiverCity": "Dar es Salaam",
    "receiverCountry": "Tanzania",
    "awbPieces": 45,
    "awbWeight": 1250,
    "volume": 15.5,
    "chargeableWeight": 1350,
    "volumeWeight": 1550,
    "description": "Medical equipment and pharmaceutical supplies",
    "airlineId": "e8a5238b-f4cf-4c3b-a602-142b64c9c4f7",
    "flightNumber": "ET-609",
    "departureTime": "2026-07-30T08:00:00Z",
    "arrivalTime": "2026-07-30T14:30:00Z"
  }'

# Export MAWB 2 — VALIDATED status (first, create DRAFT then transition it)
curl -X POST http://localhost:3000/api/master-awbs \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "awbNumber": "071-87654321",
    "trackingNumber": "SIF-EXP-002",
    "shipmentType": "CAN_GUANGZHOU",
    "paymentMode": "CC",
    "currency": "USD",
    "customsValue": 45000,
    "originStationId": "680393ef-79f6-475d-b1db-703033d4c41e",
    "destinationStationId": "d6d35225-96dc-46fb-b3dc-2a3a0efbad4b",
    "senderName": "Guangzhou Textile Export Corp",
    "senderCompany": "Guangzhou Textile Export Corp",
    "senderAddress": "456 Huanshi Road, Guangzhou",
    "senderPhone": "+862098765432",
    "senderCity": "Guangzhou",
    "senderCountry": "China",
    "receiverName": "JN Textiles (T) Ltd",
    "receiverCompany": "JN Textiles (T) Ltd",
    "receiverAddress": "456 Mkwepu Street",
    "receiverPhone": "+255765432109",
    "receiverCity": "Dar es Salaam",
    "receiverCountry": "Tanzania",
    "awbPieces": 120,
    "awbWeight": 3800,
    "volume": 42,
    "chargeableWeight": 4200,
    "volumeWeight": 4200,
    "description": "Textile fabrics and garments",
    "airlineId": "a74ca9b5-fc30-442d-a276-184406654df7",
    "flightNumber": "TK-604",
    "departureTime": "2026-08-02T10:00:00Z",
    "arrivalTime": "2026-08-02T18:00:00Z"
  }'

# Save MAWB IDs (replace with actual IDs from response)
MAWB1_ID="<id from MAWB 1 response>"
MAWB2_ID="<id from MAWB 2 response>"
```

### 4. Transition MAWB 2 to VALIDATED

```bash
# entityType lazima iwe "MasterAWB" (si "master-awb")
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d "{
    \"entityType\": \"MasterAWB\",
    \"entityId\": \"$MAWB2_ID\",
    \"action\": \"VALIDATE_SHIPMENT\",
    \"notes\": \"Validated for presentation demo\"
  }"
```

### 5. Riders (hufungwa kwa userId)

```bash
# Riders creation inahitaji userId — tumia admin userId
# Tafuta userId:
curl -s http://localhost:3000/api/me -b /tmp/sifex_cookies.txt | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])"

# Kisha tumia endpoint au ingiza moja kwa moja DB:
# Rider ameundwa kwa: userId=admin.id, vehicleType=MOTORCYCLE, phone=+255612345678
```

---

## Presentation Script — Step by Step

### 1. Utangulizi (2 min)

**Kusema:**
"Karibu kwenye Sifex Air Cargo — Enterprise Cargo Operations Platform. Hii ni platform kamili ya kudhibiti operations za mizigo ya anga, kuanzia export, import, warehouse, billing, delivery, hadi customer self-service. Ina workflow engine inayounganisha modules zote, realtime notifications, SLA tracking, na compliance kwa TCRA (Tanzania Communications Regulatory Authority)."

**Onyesha:** Slides/chart ya module zote 5 (Export → Import → Warehouse → Billing → Delivery) zikiwa connected.

---

### 2. Login & Usability (2 min)

**Kusema:**
"Tuna login mbili: Enterprise Login kwa wafanyakazi na Customer Login kwa wateja."

**Onyesha:**
1. Fungua browser → `http://localhost:3000/login`
2. Ingiza email: `admin@sifex.com`, password: `Admin123!`
3. Onyesha Workspace page na modules grid

**Kusema:**
"Baada ya login, unaona workspace yenye modules zote. Kila module ina workflow yake inayoendeshwa na workflow engine yetu."

**Onyesha:** Customer login pia
```bash
Fungua http://localhost:3000/customer/login
```

---

### 3. Export Operations (4 min)

**Kusema:**
"Export module inasimamia mzigo unaotoka China kwenda Tanzania. Inaanzia DRAFT hadi IN_TRANSIT."

**Onyesha:**
1. Nenda `/workspace/export`
2. Onyesha dashboard — KPIs, workflow progress, shipment list
3. Bofya "New Shipment" au fungua MAWB 1 (DRAFT)
4. Onyesha Quick Actions: "Edit Shipment", "Validate Shipment"
5. Bofya "Validate Shipment" → confirmation dialog
6. Baada ya validate, onyesha actions mpya: "Generate HAWB", "Print HAWB"
7. Generate HAWB → status inakuwa HAWB_GENERATED
8. Endelea: Assign MAWB → Generate Manifest → Assign Flight → Dispatch

**Demo ya Data:**
```bash
# Validate MAWB 1
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "VALIDATE_SHIPMENT"
  }'

# Generate HAWB
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "GENERATE_HAWB"
  }'
```

**Kusema:**
"Kila action inaunda audit log, timeline event, notification kwa department ya next module, na realtime update kwenye dashboard."

---

### 4. Import Operations (4 min)

**Kusema:**
"Import module inaanzia PRE_ARRIVAL wakati cargo iko angani, hadi customs clearance na warehouse handover. Ina dual verification paths — documents na pieces zinaweza kufanywa kwa order yoyote."

**Onyesha:**
1. Nenda `/workspace/import`
2. Onyesha Pipeline Kanban — columns: Pre-Arrival, Arriving, In Inspection, Customs, Ready for Warehouse, Exceptions
3. Fungua shipment → Import Operations Center yenye tabs 6 (Overview, Cargo, Documents, Customs, Timeline, Consignee)
4. Onyesha Quick Actions kwa kila step
5. Onyesha customs clearance progress bar

**Demo ya Data:**
```bash
# Confirm arrival (PRE_ARRIVAL → TERMINAL_ARRIVED)
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "CONFIRM_ARRIVAL"
  }'

# Verify manifest
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "VERIFY_MANIFEST"
  }'

# Receive MAWB + HAWBs
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "RECEIVE_MAWB"
  }'

curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "RECEIVE_HAWBS"
  }'

# Verify documents
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "VERIFY_DOCUMENTS"
  }'

# Verify pieces
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "VERIFY_PIECES"
  }'

# Verify weight
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "VERIFY_WEIGHT"
  }'

# Complete inspection
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "COMPLETE_INSPECTION"
  }'

# Submit customs
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "SUBMIT_CUSTOMS"
  }'

# Record customs assessment
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "RECORD_ASSESSMENT"
  }'

# Record duty payment
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "RECORD_DUTY_PAYMENT"
  }'

# Schedule inspection
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "SCHEDULE_INSPECTION"
  }'

# Customs released
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "CUSTOMS_RELEASED"
  }'

# Receive into warehouse
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "RECEIVE_INTO_WAREHOUSE"
  }'
```

---

### 5. Warehouse (3 min)

**Kusema:**
"Warehouse module inasimamia cargo baada ya customs clearance. Inaanzia AWAITING_STORAGE, kisha STORED, na auto-generate invoice."

**Onyesha:**
1. Nenda `/workspace/warehouse`
2. Onyesha tabs: Awaiting Storage, Stored, Billing
3. Bofya "Assign Shelf" → shelf assignment dialog
4. Onyesha storage location (zone/row/rack/bin)

**Demo ya Data:**
```bash
# Assign shelf → STORED
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "ASSIGN_SHELF"
  }'

# Invoicing inafanyika automatically (auto_invoice)
# Status inakuwa INVOICE_GENERATED → WAITING_PAYMENT
```

---

### 6. Billing (2 min)

**Kusema:**
"Billing module inashow invoices zote na status za payment. Inaunganishwa moja kwa moja na warehouse — invoice inajitengeneza yenyewe cargo inapohifadhiwa."

**Onyesha:**
1. Nenda `/workspace/billing`
2. Onyesha invoice list
3. Chagua invoice → view invoice details
4. Bofya "Receive Payment" → confirmation dialog

**Demo ya Data:**
```bash
# Receive payment → PAID
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "RECEIVE_PAYMENT"
  }'
```

**Kusema:**
"Baada ya payment, workflow inamove shipment automatically kwenye delivery phase."

---

### 7. Delivery (3 min)

**Kusema:**
"Delivery module inasimamia usafirishaji wa mizigo kwa wateja. Ina rider assignment, live tracking, na POD (Proof of Delivery)."

**Onyesha:**
1. Nenda `/workspace/delivery`
2. Onyesha delivery queue — WAITING_ASSIGNMENT, ASSIGNED, STARTED, ARRIVED, DELIVERED, COMPLETED
3. Bofya "Assign Rider" → select rider dialog
4. Onyesha rider information, customer details, address
5. Start delivery → live tracking view

**Demo ya Data:**
```bash
# Assign rider
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "ASSIGN_RIDER"
  }'

# Start delivery
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "START_DELIVERY"
  }'

# Arrive at destination
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "ARRIVE_AT_DESTINATION"
  }'

# Confirm delivery
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -b /tmp/sifex_cookies.txt \
  -d '{
    "entityType": "MasterAWB",
    "entityId": "<mawb1-id>",
    "action": "CONFIRM_DELIVERY"
  }'
```

**Kusema:**
"Baada ya delivery confirmation, shipment inakuwa COMPLETED — ndio mwisho wa end-to-end workflow."

---

### 8. Customer Portal (2 min)

**Kusema:**
"Wateja wana portal yao wenyewe ambapo wanaweza kutrack shipments, kuona invoices, na kuwasiliana na support."

**Onyesha:**
1. Nenda `http://localhost:3000/customer/login`
2. Ingiza tracking number na OTP (demo mode)
3. Onyesha customer dashboard — shipment status, KPIs
4. Bofya shipment → view timeline, documents, invoice
5. Onyesha invoice print/PDF download

---

### 9. Reports & Analytics (2 min)

**Kusema:**
"SIFEX ina reporting engine yenye aina 10 za reports, live KPI dashboard, na operational analytics."

**Onyesha:**
1. Nenda `/workspace/reports`
2. Onyesha report types: operational summary, billing, customer activity, etc.
3. Chagua date range → generate report
4. Nenda `/api/kpi` → onyesha live KPIs
5. Nenda `/api/analytics` → onyesha operational analytics

**Demo ya Data:**
```bash
# View live KPIs
curl -X GET http://localhost:3000/api/kpi \
  -b /tmp/sifex_cookies.txt | jq .

# View operational analytics
curl -X GET "http://localhost:3000/api/analytics?days=30" \
  -b /tmp/sifex_cookies.txt | jq .
```

---

### 10. Realtime Intelligence (2 min)

**Kusema:**
"System ina realtime capabilities kwa kutumia Ably. Kila workflow transition inasababisha realtime updates kwenye dashboards zote."

**Onyesha:**
1. Fungua browser tabs mbili
2. Tab 1: `/workspace/export` — onyesha export dashboard
3. Tab 2: `/workspace/import` — onyesha import dashboard
4. Fanya workflow transition kwenye tab 1 → onyesha tab 2 ikibadilika realtime
5. Onyesha notification dropdown ikionyesha realtime alerts

**Demo ya System Features:**
```bash
# Onyesha queue engine
curl -X GET http://localhost:3000/api/queues \
  -b /tmp/sifex_cookies.txt | jq .

# Onyesha SLA status
curl -X GET http://localhost:3000/api/sla \
  -b /tmp/sifex_cookies.txt | jq .

# Onyesha work inbox
curl -X GET http://localhost:3000/api/inbox \
  -b /tmp/sifex_cookies.txt | jq .
```

**Kusema:**
"Queue engine ina-auto assign work kwa departments, SLA engine inafollow up muda wa processing, na escalation engine inahakikisha matatizo yanafika kwa watu sahihi."

---

### 11. Admin & System (2 min)

**Kusema:**
"System ina user management, RBAC (Role-Based Access Control), na TCRA integration kwa compliance."

**Onyesha:**
1. Nenda `/workspace/users`
2. Onyesha user list na roles
3. Fungua role → onyesha permissions kwa kila module
4. Nenda `/workspace/tcra`
5. Onyesha TCRA event queue na status

**Demo ya Data:**
```bash
# Onyesha users
curl -X GET http://localhost:3000/api/users \
  -b /tmp/sifex_cookies.txt | jq '.data | .[].email'

# Onyesha roles
curl -X GET http://localhost:3000/api/roles \
  -b /tmp/sifex_cookies.txt | jq '.data | .[] | {code: .code, name: .name}'
```

---

### 12. Q&A na Closing (3 min)

**Kusema:**
"Asante kwa kuona Sifex Air Cargo. Hii ni platform kamili ya cargo operations yenye:
- Workflow engine inayounganisha modules zote
- Realtime updates na notifications
- SLA tracking na escalations
- Customer self-service portal
- TCRA compliance
- Enterprise-grade security na audit trails"

**Karibu maswali.**

---

## Quick Reference — URLs muhimu

| Page | URL |
|------|-----|
| Enterprise Login | `http://localhost:3000/login` |
| Workspace | `http://localhost:3000/workspace` |
| Export | `http://localhost:3000/workspace/export` |
| Import | `http://localhost:3000/workspace/import` |
| Warehouse | `http://localhost:3000/workspace/warehouse` |
| Billing | `http://localhost:3000/workspace/billing` |
| Delivery | `http://localhost:3000/workspace/delivery` |
| Reports | `http://localhost:3000/workspace/reports` |
| Customer Login | `http://localhost:3000/customer/login` |
| Customer Dashboard | `http://localhost:3000/customer/dashboard` |

## Quick Reference — API Endpoints muhimu

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/callback/credentials` | Login |
| `GET /api/me` | Current user profile + permissions |
| `POST /api/master-awbs` | Create MAWB |
| `POST /api/workflow` | Workflow transition |
| `GET /api/kpi` | Live KPIs |
| `GET /api/reports` | Operational reports |
| `GET /api/analytics` | Operational analytics |
| `GET /api/queues` | Queue engine status |
| `GET /api/sla` | SLA status |
| `GET /api/escalations` | Active escalations |
| `GET /api/inbox` | Work inbox |
| `GET /api/operations` | Operations dashboard |
| `GET /api/executive` | Executive command center |
