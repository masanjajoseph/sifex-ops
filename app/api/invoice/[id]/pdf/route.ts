import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Forward cookies from the incoming request so Puppeteer has the auth session
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").map((c) => c.trim());
      for (const cookie of cookies) {
        const [name, value] = cookie.split("=");
        if (name && value) {
          await page.setCookie({ name, value, domain: new URL(req.url).hostname, path: "/" });
        }
      }
    }

    const origin = req.nextUrl.origin;
    const url = `${origin}/workspace/billing/${id}/print?pdf=true`;
    await page.goto(url, { waitUntil: "networkidle0" });

    // Hide navbar and remove layout padding before capturing PDF
    await page.evaluate(() => {
      const header = document.querySelector("header");
      if (header) header.style.display = "none";
      const main = document.querySelector("main");
      if (main) {
        main.style.padding = "0";
        main.style.overflow = "visible";
      }
      const shell = document.querySelector(".flex.flex-col.h-screen");
      if (shell) (shell as HTMLElement).style.overflow = "visible";
    });
    await new Promise((r) => setTimeout(r, 300));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SIFEX-INVOICE-${id.slice(0, 8).toUpperCase()}.pdf"`,
      },
    });
  } catch (error) {
    await browser.close();
    console.error("PDF generation error:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}
