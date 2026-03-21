import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, Newspaper, ChevronDown, ChevronUp } from "lucide-react";
import { EVENTS } from "../data/events";

// Score each event type for sentiment
const EVENT_SCORE = {
  earnings: 2,
  product: 1.5,
  macro: 0,    // determined by impact keyword
  crash: -3,
  regulatory: -1.5,
};

const BULLISH_KEYWORDS = ["surged", "beat", "record", "growth", "rally", "boom", "up", "gain", "positive", "profit", "high", "winner"];
const BEARISH_KEYWORDS = ["fell", "dropped", "crashed", "loss", "down", "cut", "ban", "fear", "concern", "slow", "miss", "layoff"];

function scoreEvent(evt, daysAgo) {
  const recencyWeight = daysAgo < 30 ? 1.5 : daysAgo < 90 ? 1.0 : 0.5;
  let base = EVENT_SCORE[evt.type] ?? 0;
  // for macro, detect from impact text
  if (evt.type === "macro") {
    const text = (evt.impact + evt.headline).toLowerCase();
    const bull = BULLISH_KEYWORDS.filter((w) => text.includes(w)).length;
    const bear = BEARISH_KEYWORDS.filter((w) => text.includes(w)).length;
    base = (bull - bear) * 0.8;
  }
  return base * recencyWeight;
}

function computeMomentum(chartData) {
  if (!chartData || chartData.length < 12) return 0;
  const last = chartData[chartData.length - 1].close;
  const w4 = chartData[chartData.length - 5]?.close;
  const w12 = chartData[chartData.length - 13]?.close;
  let score = 0;
  if (w4 && last > w4) score += 1;
  if (w4 && last < w4) score -= 1;
  if (w12 && last > w12) score += 1.5;
  if (w12 && last < w12) score -= 1.5;
  // trend acceleration
  const recentSlope = w4 ? (last - w4) / w4 : 0;
  score += recentSlope * 10;
  return score;
}

async function fetchLiveNews(ticker) {
  const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
  const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
  const json = await res.json();
  const xml = json.contents;
  // Parse RSS items
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const items = Array.from(doc.querySelectorAll("item")).slice(0, 6);
  return items.map((item) => ({
    title: item.querySelector("title")?.textContent || "",
    link: item.querySelector("link")?.textContent || "",
    pubDate: item.querySelector("pubDate")?.textContent || "",
    description: item.querySelector("description")?.textContent?.replace(/<[^>]+>/g, "").slice(0, 120) || "",
  }));
}

const HORIZON_LABELS = {
  short: "1–4 weeks",
  mid: "1–3 months",
  long: "3–12 months",
};

function MethodologyPanel({ signalColor, totalScore, eventScore, momentumScore }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        How is this score calculated?
      </button>

      {open && (
        <div className="mt-3 rounded-lg p-4 bg-gray-800/60 border border-gray-700 text-xs text-gray-400 space-y-3">
          <p className="text-gray-200 font-semibold text-sm">Scoring methodology</p>

          {/* Two inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-md p-3 bg-gray-900/60 border border-gray-700">
              <p className="text-gray-300 font-medium mb-1.5">① Recent Events <span className="text-gray-500">(60%)</span></p>
              <p className="leading-relaxed mb-2">Each event within the past year earns a base score, then multiplied by a recency weight:</p>
              <div className="space-y-1">
                {[
                  { label: "Earnings beat/miss", score: "±2.0", color: "#10b981" },
                  { label: "Product launch", score: "+1.5", color: "#3b82f6" },
                  { label: "Macro event", score: "±0–1.2", color: "#8b5cf6" },
                  { label: "Regulatory action", score: "−1.5", color: "#f59e0b" },
                  { label: "Market crash", score: "−3.0", color: "#ef4444" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span style={{ color: r.color }}>{r.label}</span>
                    <span className="text-gray-300 font-mono font-semibold">{r.score}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-700 space-y-0.5">
                <div className="flex justify-between"><span>Last 30 days</span><span className="text-white font-semibold">1.5× weight</span></div>
                <div className="flex justify-between"><span>30–90 days</span><span className="text-white font-semibold">1.0× weight</span></div>
                <div className="flex justify-between"><span>90–365 days</span><span className="text-white font-semibold">0.5× weight</span></div>
              </div>
            </div>

            <div className="rounded-md p-3 bg-gray-900/60 border border-gray-700">
              <p className="text-gray-300 font-medium mb-1.5">② Price Momentum <span className="text-gray-500">(40%)</span></p>
              <p className="leading-relaxed mb-2">Compares the current price to recent moving averages:</p>
              <div className="space-y-1">
                {[
                  { label: "Above 4-week avg", score: "+1.0" },
                  { label: "Below 4-week avg", score: "−1.0" },
                  { label: "Above 12-week avg", score: "+1.5" },
                  { label: "Below 12-week avg", score: "−1.5" },
                  { label: "Recent acceleration", score: "±variable" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span>{r.label}</span>
                    <span className="text-gray-300 font-mono font-semibold">{r.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Formula */}
          <div className="rounded-md p-3 bg-gray-900/60 border border-gray-700">
            <p className="text-gray-300 font-medium mb-2">Final score formula</p>
            <div className="font-mono text-xs text-gray-300 leading-relaxed">
              Score = (event score × 0.6) + (momentum score × 0.4)
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1 text-center">
              {[
                { range: "≥ +3", label: "Bullish", color: "#10b981" },
                { range: "+1 to +3", label: "Mild Bullish", color: "#34d399" },
                { range: "−1 to +1", label: "Neutral", color: "#94a3b8" },
                { range: "< −1", label: "Bearish", color: "#ef4444" },
              ].map((t) => (
                <div key={t.label} className="rounded p-1.5" style={{ background: `${t.color}15`, border: `1px solid ${t.color}30` }}>
                  <div className="font-mono font-bold text-xs" style={{ color: t.color }}>{t.range}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{t.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Current breakdown */}
          <div className="rounded-md p-3 bg-gray-900/60 border border-gray-700">
            <p className="text-gray-300 font-medium mb-2">Current breakdown</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Events contribution</span>
                <span className="font-mono font-semibold" style={{ color: eventScore * 0.6 >= 0 ? "#10b981" : "#ef4444" }}>
                  {(eventScore * 0.6) >= 0 ? "+" : ""}{(eventScore * 0.6).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Momentum contribution</span>
                <span className="font-mono font-semibold" style={{ color: momentumScore * 0.4 >= 0 ? "#10b981" : "#ef4444" }}>
                  {(momentumScore * 0.4) >= 0 ? "+" : ""}{(momentumScore * 0.4).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-gray-700">
                <span className="text-gray-200 font-medium">Total score</span>
                <span className="font-mono font-bold text-sm" style={{ color: signalColor }}>
                  {totalScore >= 0 ? "+" : ""}{totalScore.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PredictionPanel({ ticker, chartData, tickerColor }) {
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);

  // Extracted so both useEffect and the retry button can call it
  const loadNews = useCallback(() => {
    setNewsLoading(true);
    setNewsError(false);
    fetchLiveNews(ticker)
      .then((items) => { setNews(items); setNewsLoading(false); })
      .catch(() => { setNewsError(true); setNewsLoading(false); });
  }, [ticker]);

  useEffect(() => { loadNews(); }, [loadNews]);

  // Compute signal
  const events = EVENTS[ticker] || [];
  const now = Date.now();
  let eventScore = 0;
  const recentEvents = [];
  events.forEach((evt) => {
    const daysAgo = (now - new Date(evt.date + "T00:00:00").getTime()) / 86400000;
    if (daysAgo < 365) {
      const s = scoreEvent(evt, daysAgo);
      eventScore += s;
      if (daysAgo < 180) recentEvents.push({ ...evt, score: s });
    }
  });
  const momentumScore = computeMomentum(chartData);
  const totalScore = eventScore * 0.6 + momentumScore * 0.4;

  let signal, signalColor, horizon, advice, bgGradient;
  if (totalScore >= 3) {
    signal = "BULLISH"; signalColor = "#10b981";
    horizon = "mid"; advice = "Momentum and recent catalysts align. Consider accumulating on pullbacks.";
    bgGradient = "from-emerald-950/50 to-gray-900";
  } else if (totalScore >= 1) {
    signal = "MILD BULLISH"; signalColor = "#34d399";
    horizon = "short"; advice = "Positive lean but watch for confirmation. Wait for a dip entry.";
    bgGradient = "from-emerald-950/30 to-gray-900";
  } else if (totalScore >= -1) {
    signal = "NEUTRAL"; signalColor = "#94a3b8";
    horizon = "mid"; advice = "Mixed signals. Stay on the sidelines until a clear catalyst emerges.";
    bgGradient = "from-gray-800/50 to-gray-900";
  } else if (totalScore >= -3) {
    signal = "MILD BEARISH"; signalColor = "#f87171";
    horizon = "short"; advice = "Near-term headwinds. Consider trimming exposure or hedging.";
    bgGradient = "from-red-950/30 to-gray-900";
  } else {
    signal = "BEARISH"; signalColor = "#ef4444";
    horizon = "long"; advice = "Significant negative pressure. Risk management is key.";
    bgGradient = "from-red-950/50 to-gray-900";
  }

  const confidence = Math.min(95, Math.round(50 + Math.abs(totalScore) * 8));
  const topFactors = recentEvents
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 3);

  return (
    <div className="mt-10 space-y-4">
      <h2 className="text-gray-300 font-semibold text-sm uppercase tracking-widest">
        Signal & Outlook · {ticker}
      </h2>

      <div className={`rounded-2xl border border-gray-800 bg-gradient-to-br ${bgGradient} overflow-hidden`}>
        {/* Top accent */}
        <div className="h-1 w-full" style={{ background: signalColor }} />

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Signal block */}
            <div className="flex-shrink-0">
              <div
                className="w-28 h-28 rounded-2xl flex flex-col items-center justify-center border-2"
                style={{ borderColor: `${signalColor}50`, background: `${signalColor}12` }}
              >
                {totalScore >= 1 ? (
                  <TrendingUp size={28} style={{ color: signalColor }} />
                ) : totalScore <= -1 ? (
                  <TrendingDown size={28} style={{ color: signalColor }} />
                ) : (
                  <Minus size={28} style={{ color: signalColor }} />
                )}
                <span className="text-xs font-black mt-1 tracking-wider" style={{ color: signalColor }}>
                  {signal}
                </span>
                <span className="text-xs text-gray-400 mt-0.5">{confidence}% conf.</span>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ background: `${signalColor}20`, color: signalColor }}
                >
                  Horizon: {HORIZON_LABELS[horizon]}
                </span>
                <span className="text-xs text-gray-500">
                  Score: {totalScore.toFixed(1)} (events: {(eventScore * 0.6).toFixed(1)}, momentum: {(momentumScore * 0.4).toFixed(1)})
                </span>
              </div>
              <p className="text-white text-sm font-medium mb-4">{advice}</p>

              {/* Key drivers */}
              {topFactors.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Key drivers</p>
                  <div className="space-y-1.5">
                    {topFactors.map((f) => (
                      <div key={f.date} className="flex items-start gap-2">
                        <span
                          className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: f.score >= 0 ? "#10b981" : "#ef4444", marginTop: 5 }}
                        />
                        <span className="text-gray-300 text-xs leading-relaxed">
                          <span className="font-semibold">{f.label}</span> — {f.headline}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Methodology toggle */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <MethodologyPanel signalColor={signalColor} totalScore={totalScore}
              eventScore={eventScore} momentumScore={momentumScore} />
            <p className="text-gray-600 text-xs mt-3">
              ⚠ This signal is algorithmic and for educational purposes only. Not financial advice.
            </p>
          </div>
        </div>
      </div>

      {/* Live News */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper size={15} className="text-gray-400" />
            <span className="text-gray-300 text-sm font-semibold">Live News · {ticker}</span>
          </div>
          {newsLoading && <RefreshCw size={13} className="text-gray-500 animate-spin" />}
        </div>

        <div className="divide-y divide-gray-800">
          {newsLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse">
                <div className="h-3 bg-gray-800 rounded w-3/4 mb-2" />
                <div className="h-2 bg-gray-800 rounded w-1/2" />
              </div>
            ))
          ) : newsError || news.length === 0 ? (
            <div className="px-5 py-6 flex flex-col items-center gap-3 text-center">
              <p className="text-gray-400 text-sm">
                Could not load news — the RSS proxy may be temporarily unavailable.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadNews}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors"
                >
                  <RefreshCw size={12} />
                  Retry
                </button>
                <a
                  href={`https://finance.yahoo.com/quote/${ticker}/news/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View on Yahoo Finance <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ) : (
            news.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-5 py-4 hover:bg-gray-800/60 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-gray-200 text-sm font-medium leading-snug group-hover:text-white transition-colors mb-1 line-clamp-2">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.pubDate && (
                      <p className="text-gray-600 text-xs mt-1">
                        {new Date(item.pubDate).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <ExternalLink size={13} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-0.5 transition-colors" />
                </div>
              </a>
            ))
          )}
        </div>

        {!newsLoading && !newsError && news.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-800">
            <a
              href={`https://finance.yahoo.com/quote/${ticker}/news/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs font-medium inline-flex items-center gap-1 transition-colors"
            >
              View all {ticker} news on Yahoo Finance <ExternalLink size={11} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
