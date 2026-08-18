import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface SearchResult {
  id: string;
  entityType: string;
  entityId: string;
  entityNumber: string;
  label: string;
  description: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  relevance: number;
  url: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  groups: SearchGroup[];
  total: number;
  query: string;
  took: number;
}

export interface SearchGroup {
  entityType: string;
  label: string;
  count: number;
  results: SearchResult[];
}

interface SearchParams {
  query: string;
  entityType?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, string>;
}

const ENTITY_SEARCH_CONFIG = [
  {
    entityType: "MasterAWB",
    label: "Master AWB",
    urlPrefix: "/workspace/master-awb",
    searchFields: ["awbNumber", "trackingNumber", "orderNumber", "senderName", "receiverName", "senderCompany", "receiverCompany", "senderPhone", "receiverPhone"],
    numberField: "awbNumber",
    statusField: "workflowStatus",
    customerField: null,
    customerPhoneField: null,
    customerEmailField: null,
    async query(where: any, take: number, skip: number) {
      return prisma.masterAWB.findMany({ where, take, skip, orderBy: { createdAt: "desc" }, select: { id: true, awbNumber: true, trackingNumber: true, orderNumber: true, senderName: true, receiverName: true, workflowStatus: true, cargoStatus: true } });
    },
    async count(where: any) { return prisma.masterAWB.count({ where }); },
    toResult(item: any, query: string): SearchResult {
      return { id: item.id, entityType: "MasterAWB", entityId: item.id, entityNumber: item.awbNumber, label: `${item.awbNumber} - ${item.receiverName || item.senderName}`, description: `Tracking: ${item.trackingNumber}`, status: item.workflowStatus || item.cargoStatus, relevance: computeRelevance(query, item.awbNumber, item.trackingNumber), url: `/workspace/master-awb/${item.id}`, metadata: { trackingNumber: item.trackingNumber, orderNumber: item.orderNumber, senderName: item.senderName, receiverName: item.receiverName } };
    },
  },
  {
    entityType: "HouseAWB",
    label: "House AWB",
    urlPrefix: "/workspace/house-awb",
    searchFields: ["houseAWBNumber", "trackingNumber", "orderNumber"],
    numberField: "houseAWBNumber",
    statusField: "workflowStatus",
    customerField: "receiverName",
    customerPhoneField: "receiverPhone",
    customerEmailField: "receiverEmail",
    async query(where: any, take: number, skip: number) {
      return prisma.houseAWB.findMany({ where, take, skip, orderBy: { createdAt: "desc" }, select: { id: true, houseAWBNumber: true, trackingNumber: true, orderNumber: true, workflowStatus: true, cargoStatus: true } });
    },
    async count(where: any) { return prisma.houseAWB.count({ where }); },
    toResult(item: any, query: string): SearchResult {
      return { id: item.id, entityType: "HouseAWB", entityId: item.id, entityNumber: item.houseAWBNumber, label: `${item.houseAWBNumber}`, description: `Tracking: ${item.trackingNumber}`, status: item.workflowStatus || item.cargoStatus, relevance: computeRelevance(query, item.houseAWBNumber, item.trackingNumber), url: `/workspace/house-awb/${item.id}` };
    },
  },
  {
    entityType: "Customer",
    label: "Customer",
    urlPrefix: "/workspace/customers",
    searchFields: ["name", "code", "email", "phone", "contactPerson", "contactPhone", "contactEmail", "taxId", "registrationNo"],
    numberField: "code",
    statusField: "kycStatus",
    customerField: "name",
    customerPhoneField: "phone",
    customerEmailField: "email",
    async query(where: any, take: number, skip: number) {
      return prisma.customer.findMany({ where, take, skip, orderBy: { createdAt: "desc" }, select: { id: true, name: true, code: true, email: true, phone: true, kycStatus: true } });
    },
    async count(where: any) { return prisma.customer.count({ where }); },
    toResult(item: any, query: string): SearchResult {
      return { id: item.id, entityType: "Customer", entityId: item.id, entityNumber: item.code, label: item.name, description: `${item.code}${item.email ? ` - ${item.email}` : ""}`, status: item.kycStatus, relevance: computeRelevance(query, item.name, item.code), url: `/workspace/customers/${item.id}`, customerName: item.name, customerPhone: item.phone, customerEmail: item.email };
    },
  },
  {
    entityType: "BillingRecord",
    label: "Invoice / Billing",
    urlPrefix: "/workspace/billing",
    searchFields: ["id"],
    numberField: "id",
    statusField: "status",
    customerField: null,
    customerPhoneField: null,
    customerEmailField: null,
    async query(where: any, take: number, skip: number) {
      return prisma.billingRecord.findMany({ where, take, skip, orderBy: { createdAt: "desc" }, select: { id: true, status: true, totalAmount: true, currency: true, customerId: true } });
    },
    async count(where: any) { return prisma.billingRecord.count({ where }); },
    toResult(item: any, query: string): SearchResult {
      return { id: item.id, entityType: "BillingRecord", entityId: item.id, entityNumber: item.id.slice(0, 8), label: `Invoice ${item.id.slice(0, 8)}`, description: `${item.currency} ${item.totalAmount} - ${item.status}`, status: item.status, relevance: 50, url: `/workspace/billing/${item.id}` };
    },
  },
  {
    entityType: "DeliveryTask",
    label: "Delivery Task",
    urlPrefix: "/workspace/delivery",
    searchFields: ["taskNumber", "customerName", "deliveryAddress", "customerPhone"],
    numberField: "taskNumber",
    statusField: "status",
    customerField: "customerName",
    customerPhoneField: "customerPhone",
    customerEmailField: null,
    async query(where: any, take: number, skip: number) {
      return prisma.deliveryTask.findMany({ where, take, skip, orderBy: { createdAt: "desc" }, select: { id: true, taskNumber: true, customerName: true, deliveryAddress: true, status: true, customerPhone: true } });
    },
    async count(where: any) { return prisma.deliveryTask.count({ where }); },
    toResult(item: any, query: string): SearchResult {
      return { id: item.id, entityType: "DeliveryTask", entityId: item.id, entityNumber: item.taskNumber, label: `${item.taskNumber} - ${item.customerName || "Unknown"}`, description: item.deliveryAddress || "", status: item.status, relevance: computeRelevance(query, item.taskNumber, item.customerName || ""), url: `/workspace/delivery/${item.id}` };
    },
  },
  {
    entityType: "Flight",
    label: "Flight",
    urlPrefix: "/workspace/flights",
    searchFields: ["flightNumber"],
    numberField: "flightNumber",
    statusField: "status",
    customerField: null,
    customerPhoneField: null,
    customerEmailField: null,
    async query(where: any, take: number, skip: number) {
      return prisma.flight.findMany({ where, take, skip, orderBy: { departureTime: "desc" }, select: { id: true, flightNumber: true, status: true, departureTime: true, arrivalTime: true } });
    },
    async count(where: any) { return prisma.flight.count({ where }); },
    toResult(item: any, query: string): SearchResult {
      return { id: item.id, entityType: "Flight", entityId: item.id, entityNumber: item.flightNumber, label: `Flight ${item.flightNumber}`, description: `${item.departureTime?.toLocaleDateString() || ""} - ${item.status}`, status: item.status, relevance: computeRelevance(query, item.flightNumber), url: `/workspace/flights/${item.id}` };
    },
  },
  {
    entityType: "Manifest",
    label: "Manifest",
    urlPrefix: "/workspace/manifests",
    searchFields: ["manifestNumber"],
    numberField: "manifestNumber",
    statusField: "status",
    customerField: null,
    customerPhoneField: null,
    customerEmailField: null,
    async query(where: any, take: number, skip: number) {
      return prisma.manifest.findMany({ where, take, skip, orderBy: { createdAt: "desc" }, select: { id: true, manifestNumber: true, status: true, manifestType: true } });
    },
    async count(where: any) { return prisma.manifest.count({ where }); },
    toResult(item: any, query: string): SearchResult {
      return { id: item.id, entityType: "Manifest", entityId: item.id, entityNumber: item.manifestNumber, label: `Manifest ${item.manifestNumber}`, description: `Type: ${item.manifestType} - ${item.status}`, status: item.status, relevance: computeRelevance(query, item.manifestNumber), url: `/workspace/manifests/${item.id}` };
    },
  },
  {
    entityType: "DeliveryNote",
    label: "Delivery Note",
    urlPrefix: "/workspace/delivery",
    searchFields: ["recipientName", "recipientPhone", "id"],
    numberField: "id",
    statusField: "status",
    customerField: "recipientName",
    customerPhoneField: "recipientPhone",
    customerEmailField: null,
    async query(where: any, take: number, skip: number) {
      return prisma.deliveryNote.findMany({ where, take, skip, orderBy: { createdAt: "desc" }, select: { id: true, recipientName: true, recipientPhone: true, status: true, signature: true, signedAt: true, createdAt: true } });
    },
    async count(where: any) { return prisma.deliveryNote.count({ where }); },
    toResult(item: any, query: string): SearchResult {
      return { id: item.id, entityType: "DeliveryNote", entityId: item.id, entityNumber: item.id.slice(0, 8), label: `Delivery Note - ${item.recipientName || "Unknown"}`, description: `Status: ${item.status}`, status: item.status, relevance: computeRelevance(query, item.recipientName || ""), url: `/workspace/delivery/${item.id}` };
    },
  },
];

function computeRelevance(query: string, ...fields: (string | null | undefined)[]): number {
  const q = query.toLowerCase();
  let score = 0;
  for (const field of fields) {
    if (!field) continue;
    const f = field.toLowerCase();
    if (f === q) score += 100;
    else if (f.startsWith(q)) score += 80;
    else if (f.includes(q)) score += 50;
    else if (f.split(/\s+/).some(w => w.startsWith(q))) score += 30;
  }
  return score;
}

function buildSearchWhere(query: string, searchFields: string[]): any {
  return {
    OR: searchFields.flatMap(field => [
      { [field]: { contains: query, mode: "insensitive" } },
    ]),
  };
}

export async function enterpriseSearch(params: SearchParams): Promise<SearchResponse> {
  const start = Date.now();
  const { query, entityType, limit = 20, offset = 0 } = params;

  if (!query || query.length < 2) {
    return { results: [], groups: [], total: 0, query, took: 0 };
  }

  const configs = entityType
    ? ENTITY_SEARCH_CONFIG.filter(c => c.entityType === entityType)
    : ENTITY_SEARCH_CONFIG;

  const allResults: SearchResult[] = [];

  for (const config of configs) {
    try {
      const where = buildSearchWhere(query, config.searchFields);
      const items = await config.query(where, limit, 0);
      const results = items.map(item => config.toResult(item, query));
      allResults.push(...results);
    } catch (error) {
      logger.error(`Search failed for ${config.entityType}`, error as Error, "SearchEngine");
    }
  }

  allResults.sort((a, b) => b.relevance - a.relevance);

  const total = allResults.length;
  const paged = allResults.slice(offset, offset + limit);

  const groupsMap = new Map<string, SearchResult[]>();
  for (const r of paged) {
    const arr = groupsMap.get(r.entityType) || [];
    arr.push(r);
    groupsMap.set(r.entityType, arr);
  }

  const configLookup = new Map(ENTITY_SEARCH_CONFIG.map(c => [c.entityType, c]));
  const groups: SearchGroup[] = [];
  for (const [entityType, results] of groupsMap) {
    const cfg = configLookup.get(entityType);
    groups.push({ entityType, label: cfg?.label || entityType, count: results.length, results });
  }

  return {
    results: paged,
    groups,
    total,
    query,
    took: Date.now() - start,
  };
}

export async function getRecentSearches(userId: string, limit = 10) {
  return prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, query: true, entityType: true, resultCount: true, createdAt: true },
  });
}

export async function saveSearchHistory(userId: string, query: string, entityType?: string, resultCount = 0) {
  return prisma.searchHistory.create({
    data: { userId, query, entityType, resultCount },
  });
}
