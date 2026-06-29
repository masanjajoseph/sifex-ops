// Feature flags - driven by config/features.ts but runtime-accessible
export const FEATURE_FLAGS = {
  OFFLINE_MODE: process.env.NEXT_PUBLIC_FEATURE_OFFLINE === "true",
  BARCODE_SCANNER: process.env.NEXT_PUBLIC_FEATURE_BARCODE !== "false",
  MULTI_TENANT: process.env.NEXT_PUBLIC_FEATURE_MULTI_TENANT === "true",
  DARK_MODE: true,
  COMMAND_PALETTE: true,
  AUDIT_LOGGING: true,
  NOTIFICATIONS: process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS !== "false",
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (flag: FeatureFlag): boolean =>
  FEATURE_FLAGS[flag];

// App-level constants
export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Sifex ERP",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  version: "1.0.0",
  sessionMaxAge: 8 * 60 * 60, // 8 hours in seconds
  auditRetentionDays: 90,
  passwordMinLength: 8,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
} as const;


