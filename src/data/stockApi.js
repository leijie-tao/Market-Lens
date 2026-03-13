// Price data is bundled at build time — zero network requests, instant load.
// To refresh: node scripts/fetchPriceData.mjs  (then redeploy)
import BUNDLED from "./priceData.json";

export async function fetchStockHistory(ticker) {
  const data = BUNDLED[ticker];
  if (data && data.length > 0) return data;
  throw new Error(`No bundled data for ${ticker}`);
}

// No-op — data is already bundled, nothing to prefetch
export function prefetchAll() {}
