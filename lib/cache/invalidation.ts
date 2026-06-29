import { cache, invalidatePattern } from ".";
import { CACHE_KEYS } from "./keys";

export function onMasterAWBChanged(id: string) {
  invalidatePattern(CACHE_KEYS.masterAWB(id));
  invalidatePattern(CACHE_KEYS.list("master-awbs", "*"));
  invalidatePattern(CACHE_KEYS.dashboard("*"));
}

export function onHouseAWBChanged(id: string) {
  invalidatePattern(CACHE_KEYS.houseAWB(id));
  invalidatePattern(CACHE_KEYS.list("house-awbs", "*"));
  invalidatePattern(CACHE_KEYS.dashboard("*"));
}

export function onBillingChanged(id: string) {
  invalidatePattern(CACHE_KEYS.billing(id));
  invalidatePattern(CACHE_KEYS.list("billing", "*"));
  invalidatePattern(CACHE_KEYS.dashboard("*"));
}

export function onExchangeRateChanged() {
  invalidatePattern(CACHE_KEYS.exchangeRate);
}

export function onSettingsChanged() {
  invalidatePattern(CACHE_KEYS.settings);
}

export async function flushCache(): Promise<void> {
  await cache.flushall();
}
