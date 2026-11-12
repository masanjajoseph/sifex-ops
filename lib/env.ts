import { z } from "zod";

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Sifex Air Cargo"),

  // Database
  DATABASE_URL: z.string().min(1),

  // Auth
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().url().optional(),

  // Storage
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  STORAGE_BUCKET: z.string().optional(),

  // S3
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),

  // Redis / Upstash
  UPSTASH_REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // Realtime (Ably)
  ABLY_API_KEY: z.string().optional(),

  // Job queues
  JOB_PROCESSOR_ENABLED: z.coerce.boolean().default(false),
  BULL_WORKER_CONCURRENCY: z.coerce.number().default(5),

  // SMS
  SMS_PROVIDER: z.enum(["twilio", "bonga", "log"]).default("log"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE: z.string().optional(),

  // Bonga SMS (Tanzania)
  BONGA_API_KEY: z.string().optional(),
  BONGA_API_SECRET: z.string().optional(),
  BONGA_SENDER_ID: z.string().default("SIFEX"),
  BONGA_API_URL: z.string().default("https://api.bonga.co.tz/v1"),
  BONGA_CALLBACK_URL: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),

  // Monitoring
  PROMETHEUS_ENABLED: z.coerce.boolean().default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),

  // TCRA integration
  TCRA_API_URL: z.string().url().optional(),
  TCRA_API_TOKEN: z.string().optional(),
  TCRA_TEST_MODE: z.coerce.boolean().default(false),
  TCRA_PRIVATE_KEY: z.string().optional(),
  TCRA_PUBLIC_KEY: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const missing = Object.entries(errors)
      .map(([k, v]) => `  ${k}: ${v?.join(", ")}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${missing}`);
  }
  return result.data;
}

export const env = validateEnv();
