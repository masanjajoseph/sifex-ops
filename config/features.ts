// Feature flags system

export enum FeatureFlag {
  OFFLINE_MODE = "offline_mode",
  BARCODE_SCANNING = "barcode_scanning",
  MOBILE_APP = "mobile_app",
  ADVANCED_ANALYTICS = "advanced_analytics",
  MULTI_CURRENCY = "multi_currency",
  EMAIL_NOTIFICATIONS = "email_notifications",
  SMS_NOTIFICATIONS = "sms_notifications",
  EXPORT_OPERATIONS = "export_operations",
  IMPORT_OPERATIONS = "import_operations",
}

interface FeatureFlagConfig {
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
}

const FEATURE_FLAGS: Record<FeatureFlag, FeatureFlagConfig> = {
  [FeatureFlag.OFFLINE_MODE]: {
    enabled: false,
    description: "Enable offline mode with local sync",
  },
  [FeatureFlag.BARCODE_SCANNING]: {
    enabled: true,
    description: "Enable barcode/QR scanning",
  },
  [FeatureFlag.MOBILE_APP]: {
    enabled: true,
    description: "Enable mobile app features",
  },
  [FeatureFlag.ADVANCED_ANALYTICS]: {
    enabled: false,
    description: "Enable advanced analytics dashboard",
  },
  [FeatureFlag.MULTI_CURRENCY]: {
    enabled: false,
    description: "Enable multi-currency support",
  },
  [FeatureFlag.EMAIL_NOTIFICATIONS]: {
    enabled: true,
    description: "Enable email notifications",
  },
  [FeatureFlag.SMS_NOTIFICATIONS]: {
    enabled: false,
    description: "Enable SMS notifications",
  },
  [FeatureFlag.EXPORT_OPERATIONS]: {
    enabled: true,
    description: "Enable export operations module",
  },
  [FeatureFlag.IMPORT_OPERATIONS]: {
    enabled: true,
    description: "Enable import operations module",
  },
};

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag]?.enabled ?? false;
};

export const getFeatureConfig = (flag: FeatureFlag): FeatureFlagConfig | undefined => {
  return FEATURE_FLAGS[flag];
};

export const getAllFeatures = () => FEATURE_FLAGS;
