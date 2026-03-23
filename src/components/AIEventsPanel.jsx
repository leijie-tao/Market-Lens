import { useState } from "react";
import { Sparkles, ExternalLink, ChevronDown, ChevronUp, Loader } from "lucide-react";
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

async function fetchAIEvents(ticker, from, to) {
  const res = await fetch(
    `/api/ai-events?ticker=${encodeURIComponent(ticker)}&from=${from}&to=${to}`,
    { signal: AbortSignal.timeout(35000) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err?.error || `API error ${res.status}`);
    e.status = res.status;
    throw e;
  }

  return res.json();
}

export default function AIEventsPanel({ ticker, tickerColor }) {
  const [range, setRange] = useState(YEAR_RANGES[0]);
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    setEvents(null);
    try {
      const result = await fetchAIEvents(ticker, range.from, range.to);
      setEvents(result);
    } catch (e) {
      if (e.status === 429) {
        setError("Too many requests — please wait a moment and try again.");
      } else if (e.status === 503) {
        setError("AI events are not available right now.");
      } else if (e.status >= 500) {
        setError("Server error — try again in a moment.");
      } else if (!navigator.onLine || e.name === "TypeError") {
        setError("Network error — check your internet connection and try again.");
      } else {
        setError(e.message || "Something went wrong. Try again.");
      }
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
          <span className="text-xs text-gray-500 ml-1">· powered by Gemini</span>
        </div>
        {open ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
      </button>

      {open && (
        <div className="border-t border-gray-800">
          {/* Controls */}
          <div className="px-5 py-4 flex flex-wrap gap-3 items-end border-b border-gray-800">
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
                Click "Find events" to let Gemini discover the biggest market-moving moments for {ticker}.
              </p>
            )}
          </div>

          <div className="px-5 pb-4">
            <p className="text-gray-700 text-xs">
              Powered by Gemini 1.5 Flash · AI-generated results may contain inaccuracies · For educational purposes only
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
