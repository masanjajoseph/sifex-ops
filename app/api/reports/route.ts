import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import {
  getShipmentReports,
  getInvoiceReports,
  getDeliveryReports,
  getCustomerReports,
  getAllReports,
} from "@/features/cargo/reports/report.service";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);
  if (!hasPermission(session, "reports.view")) return apiError(new Error("Forbidden"), 403);

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "all";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const params = { from, to };

  switch (type) {
    case "shipments":
      return apiSuccess(await getShipmentReports(params));
    case "invoices":
      return apiSuccess(await getInvoiceReports(params));
    case "deliveries":
      return apiSuccess(await getDeliveryReports(params));
    case "customers":
      return apiSuccess(await getCustomerReports(params));
    default:
      return apiSuccess(await getAllReports(params));
  }
});
