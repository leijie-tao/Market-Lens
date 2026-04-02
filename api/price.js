// Vercel serverless function — fetches weekly price history for any ticker from Yahoo Finance
export default async function handler(req, res) {
  const { ticker } = req.query;

  if (!ticker || !/^[A-Za-z]{1,6}$/.test(ticker)) {
    return res.status(400).json({ error: "Invalid ticker symbol" });
  }

  const symbol = ticker.toUpperCase();
  const period1 = Math.floor(new Date("2020-01-01").getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1wk&period1=${period1}&period2=${period2}&includeAdjustedClose=true`;

  try {
    const yahooRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketLens/1.0)" },
      signal: AbortSignal.timeout(10000),
    });

    if (!yahooRes.ok) {
      return res.status(yahooRes.status === 404 ? 404 : 502).json({
        error: yahooRes.status === 404 ? `Ticker "${symbol}" not found` : `Yahoo Finance returned ${yahooRes.status}`,
      });
    }

    const json = await yahooRes.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      return res.status(404).json({ error: `No data found for "${symbol}"` });
    }

    const timestamps = result.timestamp;
    const closes =
      result.indicators.adjclose?.[0]?.adjclose ??
      result.indicators.quote[0].close;

    const data = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split("T")[0],
        close: closes[i] != null ? +closes[i].toFixed(2) : null,
      }))
      .filter((p) => p.close !== null);

    if (data.length === 0) {
      return res.status(404).json({ error: `No price data available for "${symbol}"` });
    }

    // Cache 1 hour — historical weekly data rarely changes intraday
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=300");
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message || "Failed to fetch price data" });
  }
}
