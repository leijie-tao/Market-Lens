import { useState } from "react";
import { Sparkles, ExternalLink, ChevronDown, ChevronUp, Key, Loader } from "lucide-react";
import { EVENT_COLORS } from "../data/events";

const TYPE_ICONS = {
  earnings: "💰", product: "🚀", macro: "🌐", crash: "⚠️", regulatory: "⚖️",
};

const YEAR_RANGES = [
  { label: "2024–2025", from: "2024-01-01", to: "2025-12-31" },
  { label: "2022–2023", from: "2022-01-01", to: "2023-12-31" },
  { label: "2020–2021", from: "2020-01-01", to: "2021-12-31" },
  { label: "All (2020–now)", from: "2020-01-01", to: new Date().toISOString().split("T")[0] },
];

async function fetchAIEvents(ticker, from, to, apiKey) {
  const prompt = `You are a financial research assistant with knowledge of stock market history.

Return the 6 most market-moving events for ${ticker} between ${from} and ${to}.

Respond with ONLY a valid JSON array — no explanation, no markdown, no code fences. Each object must have exactly these fields:
- "date": "YYYY-MM-DD" (the exact date the event became public)
- "category": one of exactly: "earnings" | "product" | "macro" | "crash" | "regulatory"
- "headline": one concise sentence (max 15 words) describing what happened
- "impact": one sentence describing the stock price reaction including % move if known
- "sources": estimated media coverage as a string like "800+ articles"

Only include events that caused a measurable stock move of 3% or more. Order by date ascending.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  // Strip any accidental markdown fences
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

export default function AIEventsPanel({ ticker, tickerColor }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("ml_claude_key") || "");
  const [keyVisible, setKeyVisible] = useState(false);
  const [range, setRange] = useState(YEAR_RANGES[0]);
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const saveKey = (val) => {
    setApiKey(val);
    if (val) localStorage.setItem("ml_claude_key", val);
  };

  const handleFetch = async () => {
    if (!apiKey.trim()) { setError("Enter your Claude API key first."); return; }
    setLoading(true);
    setError(null);
    setEvents(null);
    try {
      const result = await fetchAIEvents(ticker, range.from, range.to, apiKey.trim());
      setEvents(result);
    } catch (e) {
      setError(e.message || "Failed to fetch. Check your API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
      {/* Header — always visible, toggles body */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={15} style={{ color: tickerColor }} />
          <span className="text-gray-200 text-sm font-semibold">AI-Curated Events</span>
          <span className="text-xs text-gray-500 ml-1">· powered by Claude</span>
        </div>
        {open ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
      </button>

      {open && (
        <div className="border-t border-gray-800">
          {/* Controls */}
          <div className="px-5 py-4 flex flex-wrap gap-3 items-end border-b border-gray-800">
            {/* API key input */}
            <div className="flex-1 min-w-48">
              <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Key size={11} /> Claude API key
              </label>
              <div className="relative">
                <input
                  type={keyVisible ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => saveKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 pr-16"
                />
                <button
                  onClick={() => setKeyVisible((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                >
                  {keyVisible ? "hide" : "show"}
                </button>
              </div>
            </div>

            {/* Date range */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date range</label>
              <div className="flex gap-1.5">
                {YEAR_RANGES.map((r) => (
                  <button key={r.label}
                    onClick={() => setRange(r)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      range.label === r.label
                        ? "border-transparent text-white"
                        : "border-gray-700 text-gray-500 hover:text-gray-300 bg-gray-800"
                    }`}
                    style={range.label === r.label
                      ? { background: `${tickerColor}25`, borderColor: `${tickerColor}50`, color: tickerColor }
                      : {}}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fetch button */}
            <button
              onClick={handleFetch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: tickerColor }}
            >
              {loading
                ? <><Loader size={13} className="animate-spin" /> Searching…</>
                : <><Sparkles size={13} /> Find events</>}
            </button>
          </div>

          {/* Results */}
          <div className="px-5 py-4">
            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-3">{error}</p>
            )}

            {loading && (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-gray-800 p-4">
                    <div className="h-3 bg-gray-800 rounded w-1/4 mb-2" />
                    <div className="h-3 bg-gray-800 rounded w-3/4 mb-2" />
                    <div className="h-2 bg-gray-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {events && !loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {events.map((evt, i) => {
                  const color = EVENT_COLORS[evt.category] || "#888";
                  const icon = TYPE_ICONS[evt.category] || "●";
                  const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(ticker + " " + evt.headline)}`;
                  return (
                    <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-500 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: `${color}20`, color }}>
                          {icon} {evt.category}
                        </span>
                        <span className="text-gray-500 text-xs">{evt.date}</span>
                      </div>
                      <p className="text-gray-200 text-sm font-medium mb-1 leading-snug">{evt.headline}</p>
                      <p className="text-gray-400 text-xs leading-relaxed mb-3">{evt.impact}</p>
                      <div className="flex items-center justify-between">
                        {evt.sources && (
                          <span className="text-xs text-gray-500">📰 {evt.sources}</span>
                        )}
                        <a href={searchUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors ml-auto">
                          <ExternalLink size={11} /> Read coverage
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!events && !loading && !error && (
              <p className="text-gray-600 text-xs text-center py-4">
                Enter your API key and click "Find events" to let Claude search for the biggest market-moving moments for {ticker}.
              </p>
            )}
          </div>

          <div className="px-5 pb-4">
            <p className="text-gray-700 text-xs">
              Uses claude-haiku-4-5 · Your API key is stored locally and never sent to our servers ·{" "}
              <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-300 inline-flex items-center gap-0.5">
                Get a key <ExternalLink size={10} />
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
