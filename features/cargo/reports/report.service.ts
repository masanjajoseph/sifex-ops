import { prisma } from "@/lib/prisma";

export interface DateRangeParams {
  from?: string;
  to?: string;
}

function buildDateFilter(from?: string, to?: string) {
  if (!from && !to) return {};
  const filter: Record<string, Date> = {};
  if (from) filter.gte = new Date(from);
  if (to) filter.lte = new Date(to);
  return filter;
}

export async function getShipmentReports(params: DateRangeParams) {
  const dateFilter = buildDateFilter(params.from, params.to);
  const baseWhere = { deletedAt: null, ...(dateFilter.createdAt ? { createdAt: dateFilter } : {}) };

  const [total, arrived, warehouse, delivered, pending] = await Promise.all([
    prisma.houseAWB.count({ where: baseWhere }),
    prisma.houseAWB.count({ where: { ...baseWhere, cargoStatus: "ARRIVED" } }),
    prisma.houseAWB.count({ where: { ...baseWhere, workflowStage: "WAREHOUSE" } }),
    prisma.houseAWB.count({ where: { ...baseWhere, cargoStatus: "DELIVERED" } }),
    prisma.houseAWB.count({ where: { ...baseWhere, cargoStatus: { notIn: ["DELIVERED", "POD_SIGNED", "CANCELLED"] } } }),
  ]);

  const byStage = await prisma.houseAWB.groupBy({
    by: ["workflowStage"],
    where: baseWhere,
    _count: true,
  });

  const byStatus = await prisma.houseAWB.groupBy({
    by: ["cargoStatus"],
    where: baseWhere,
    _count: true,
  });

  return { total, arrived, warehouse, delivered, pending, byStage, byStatus };
}

export async function getInvoiceReports(params: DateRangeParams) {
  const dateFilter = buildDateFilter(params.from, params.to);
  const where = { deletedAt: null, ...(dateFilter.createdAt ? { createdAt: dateFilter } : {}) };

  const [total, paid, unpaid, revenue] = await Promise.all([
    prisma.billingRecord.aggregate({ where, _count: true, _sum: { totalAmount: true } }),
    prisma.billingRecord.aggregate({
      where: { ...where, status: "PAID" },
      _count: true,
      _sum: { totalAmount: true, paidAmount: true },
    }),
    prisma.billingRecord.count({ where: { ...where, status: { in: ["UNPAID", "NOT_BILLED", "DRAFT"] } } }),
    prisma.billingRecord.aggregate({
      where: { ...where, status: "PAID" },
      _sum: { paidAmount: true },
    }),
  ]);

  const byStatus = await prisma.billingRecord.groupBy({
    by: ["status"],
    where,
    _count: true,
    _sum: { totalAmount: true },
  });

  return {
    totalInvoices: total._count,
    totalAmount: total._sum.totalAmount || 0,
    paidInvoices: paid._count,
    paidAmount: paid._sum.paidAmount || 0,
    unpaidInvoices: unpaid,
    revenue: revenue._sum.paidAmount || 0,
    byStatus,
  };
}

export async function getDeliveryReports(params: DateRangeParams) {
  const dateFilter = buildDateFilter(params.from, params.to);
  const where = { deletedAt: null, ...(dateFilter.assignedAt ? { assignedAt: dateFilter } : {}) };

  const [assigned, completed, failed] = await Promise.all([
    prisma.deliveryAssignment.count({ where }),
    prisma.deliveryAssignment.count({ where: { ...where, status: "DELIVERED" } }),
    prisma.deliveryAssignment.count({ where: { ...where, status: "FAILED" } }),
  ]);

  const byStatus = await prisma.deliveryAssignment.groupBy({
    by: ["status"],
    where,
    _count: true,
  });

  return { assigned, completed, failed, byStatus };
}

export async function getCustomerReports(params: DateRangeParams) {
  const dateFilter = buildDateFilter(params.from, params.to);
  const where = { deletedAt: null, ...(dateFilter.createdAt ? { createdAt: dateFilter } : {}) };

  const [total, active] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.count({ where: { ...where, isActive: true } }),
  ]);

  const topCustomers = await prisma.houseAWB.groupBy({
    by: ["shipperId"],
    where: { deletedAt: null },
    _count: true,
    orderBy: { _count: { shipperId: "desc" } },
    take: 10,
  });

  const customerNames = await prisma.customer.findMany({
    where: { id: { in: topCustomers.map((c) => c.shipperId) } },
    select: { id: true, name: true },
  });

  const nameMap = new Map(customerNames.map((c) => [c.id, c.name]));

  return {
    totalCustomers: total,
    activeCustomers: active,
    topCustomers: topCustomers.map((c) => ({
      customerId: c.shipperId,
      customerName: nameMap.get(c.shipperId) ?? "Unknown",
      shipmentCount: c._count,
    })),
  };
}

export async function getAllReports(params: DateRangeParams) {
  const [shipments, invoices, deliveries, customers] = await Promise.all([
    getShipmentReports(params),
    getInvoiceReports(params),
    getDeliveryReports(params),
    getCustomerReports(params),
  ]);

  return { shipments, invoices, deliveries, customers };
}
