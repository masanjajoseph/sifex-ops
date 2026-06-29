import { env } from "@/lib/env";
import { registerCargoEventHandlers } from "@/features/cargo/events/cargo-event-subscriber";
import { subscribeToEvents } from "@/lib/tcra/events";

export async function register() {
  registerCargoEventHandlers();
  subscribeToEvents();

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
