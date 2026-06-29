import client from "prom-client";

const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["operation", "model"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1],
  registers: [register],
});

export const jobProcessingDuration = new client.Histogram({
  name: "job_processing_duration_seconds",
  help: "Background job processing duration in seconds",
  labelNames: ["queue", "job"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const activeJobsGauge = new client.Gauge({
  name: "active_jobs",
  help: "Number of active background jobs",
  labelNames: ["queue"],
  registers: [register],
});

export const cacheHitRatio = new client.Counter({
  name: "cache_hits_total",
  help: "Total cache hits",
  labelNames: ["key"],
  registers: [register],
});

export const cacheMissRatio = new client.Counter({
  name: "cache_misses_total",
  help: "Total cache misses",
  labelNames: ["key"],
  registers: [register],
});

export const apiRequestsTotal = new client.Counter({
  name: "api_requests_total",
  help: "Total API requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export async function getMetrics(): Promise<string> {
  return register.metrics();
}
