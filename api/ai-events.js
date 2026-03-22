// Vercel serverless function — calls Google Gemini API server-side
export default async function handler(req, res) {
  const { ticker, from, to } = req.query;

  if (!ticker || !from || !to) {
    return res.status(400).json({ error: "Missing required params: ticker, from, to" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI events are not configured on this server." });
  }

  const prompt = `You are a financial research assistant with knowledge of stock market history.

Return the 6 most market-moving events for ${ticker} between ${from} and ${to}.

Respond with ONLY a valid JSON array — no explanation, no markdown, no code fences. Each object must have exactly these fields:
- "date": "YYYY-MM-DD" (the exact date the event became public)
- "category": one of exactly: "earnings" | "product" | "macro" | "crash" | "regulatory"
- "headline": one concise sentence (max 15 words) describing what happened
- "impact": one sentence describing the stock price reaction including % move if known
- "sources": estimated media coverage as a string like "800+ articles"

Only include events that caused a measurable stock move of 3% or more. Order by date ascending.`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      return res.status(geminiRes.status).json({
        error: err?.error?.message || `Gemini API error ${geminiRes.status}`,
      });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const events = JSON.parse(cleaned);

    // Cache for 1 hour — same query for same ticker/range returns quickly
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=300");
    res.status(200).json(events);
  } catch (err) {
    res.status(502).json({ error: err.message || "Failed to fetch AI events" });
  }
}
