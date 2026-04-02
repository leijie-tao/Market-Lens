// Price data is bundled at build time for the 11 demo tickers — instant load.
// For any other ticker, falls back to the /api/price serverless route.
// To refresh bundled data: node scripts/fetchPriceData.mjs  (then redeploy)
import BUNDLED from "./priceData.json";

export async function fetchStockHistory(ticker) {
  const bundled = BUNDLED[ticker];
  if (bundled && bundled.length > 0) return bundled;

  // Unknown ticker — fetch on demand from Vercel API route
  const res = await fetch(`/api/price?ticker=${encodeURIComponent(ticker)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Could not load data for ${ticker}`);
  }
  return res.json();
}

// No-op — data is already bundled, nothing to prefetch
export function prefetchAll() {}
