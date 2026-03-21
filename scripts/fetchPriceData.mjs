// Run once with: node scripts/fetchPriceData.mjs
// Fetches weekly price history for all demo tickers directly from Yahoo Finance
// (server-side = no CORS issues) and saves to src/data/priceData.json

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TICKERS = ["NVDA", "TSLA", "AMZN", "META", "AAPL", "MSFT", "SPY"];
const FROM = "2020-01-01";

async function fetchTicker(ticker) {
  const period1 = Math.floor(new Date(FROM).getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1wk&period1=${period1}&period2=${period2}&includeAdjustedClose=true`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MarketLens/1.0)",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} for ${ticker}`);
  const json = await res.json();

  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${ticker}`);

  const timestamps = result.timestamp;
  const closes =
    result.indicators.adjclose?.[0]?.adjclose ??
    result.indicators.quote[0].close;

  return timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split("T")[0],
      close: closes[i] != null ? +closes[i].toFixed(2) : null,
    }))
    .filter((p) => p.close !== null);
}

const output = {};
for (const ticker of TICKERS) {
  process.stdout.write(`Fetching ${ticker}...`);
  try {
    output[ticker] = await fetchTicker(ticker);
    console.log(` ${output[ticker].length} weeks of data`);
  } catch (e) {
    console.error(` FAILED: ${e.message}`);
  }
  // small delay to avoid rate limiting
  await new Promise((r) => setTimeout(r, 400));
}

const outPath = resolve(__dirname, "../src/data/priceData.json");
const result = {
  _meta: { fetchedAt: new Date().toISOString() },
  ...output,
};
writeFileSync(outPath, JSON.stringify(result));
console.log(`\nSaved to src/data/priceData.json`);
console.log(`Fetched at: ${new Date().toISOString()}`);
