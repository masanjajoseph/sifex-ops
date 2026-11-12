import { env } from "@/lib/env";

export async function register() {
  // Only run in Node.js runtime — Edge runtime cannot import Node modules
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ registerCargoEventHandlers }, { subscribeToEvents }] = await Promise.all([
    import("@/features/cargo/events/cargo-event-subscriber"),
    import("@/lib/tcra/events"),
  ]);

  registerCargoEventHandlers();
  subscribeToEvents();

  // Load TCRA key material when configured (used for signature verification /
  // legacy signature auth). JWT bearer auth uses TCRA_API_TOKEN instead.
  if (env.TCRA_PRIVATE_KEY && env.TCRA_PUBLIC_KEY) {
    const { initTcraKeys } = await import("@/lib/tcra/signing");
    initTcraKeys(env.TCRA_PRIVATE_KEY, env.TCRA_PUBLIC_KEY);
  }

  if (env.NODE_ENV === "production" && env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    const { diag, DiagConsoleLogger } = await import("@opentelemetry/api");
    diag.setLogger(new DiagConsoleLogger());

    const { getNodeAutoInstrumentations } = await import("@opentelemetry/auto-instrumentations-node");
    const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-grpc");
    const { NodeSDK } = await import("@opentelemetry/sdk-node");

    const sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({
        url: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });

    await sdk.start();
  }
}
