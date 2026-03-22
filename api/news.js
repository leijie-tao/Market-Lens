// Vercel serverless function — proxies Yahoo Finance RSS to avoid browser CORS issues
export default async function handler(req, res) {
  const { ticker } = req.query;

  if (!ticker || typeof ticker !== "string" || !/^[A-Z]{1,6}$/.test(ticker.toUpperCase())) {
    return res.status(400).json({ error: "Invalid ticker" });
  }

  const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker.toUpperCase())}&region=US&lang=en-US`;

  try {
    const response = await fetch(rssUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketLens/1.0)" },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Yahoo RSS returned ${response.status}` });
    }

    const xml = await response.text();
    const items = parseRssItems(xml, 6);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    res.status(200).json(items);
  } catch (err) {
    res.status(502).json({ error: err.message || "Failed to fetch news" });
  }
}

function parseRssItems(xml, limit) {
  const results = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const itemXml of itemMatches.slice(0, limit)) {
    const get = (tag) => {
      // CDATA wrapped value
      const cdata = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
      if (cdata) return cdata[1].trim();
      // Plain text value
      const plain = itemXml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`));
      return plain ? plain[1].trim() : "";
    };

    results.push({
      title: get("title"),
      link: get("link"),
      pubDate: get("pubDate"),
      description: get("description").replace(/<[^>]+>/g, "").slice(0, 120),
    });
  }

  return results;
}
