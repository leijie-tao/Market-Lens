import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, ExternalLink, Newspaper, Info, ChevronDown, ChevronUp } from "lucide-react";
import StockChart from "./components/StockChart";
import TickerSearch from "./components/TickerSearch";
import EventLegend from "./components/EventLegend";
import PredictionPanel from "./components/PredictionPanel";
import AIEventsPanel from "./components/AIEventsPanel";
import { EVENTS, TICKER_META, EVENT_COLORS } from "./data/events";
import { fetchStockHistory, prefetchAll } from "./data/stockApi";
import BUNDLED from "./data/priceData.json";
const SPY_DATA = BUNDLED["SPY"] || [];
const DATA_DATE = BUNDLED._meta?.fetchedAt
  ? new Date(BUNDLED._meta.fetchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  : null;

const DEFAULT_TICKER = "NVDA";

export default function App() {
  const [ticker, setTicker] = useState(DEFAULT_TICKER);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [volatilityThreshold, setVolatilityThreshold] = useState(0);
  const [criteriaOpen, setCriteriaOpen] = useState(false);

  // Pre-warm all demo tickers in background on first load
  useEffect(() => { prefetchAll(); }, []);

  const meta = TICKER_META[ticker] || { name: ticker, sector: "", color: "#3b82f6" };
  const events = EVENTS[ticker] || [];

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchStockHistory(ticker)
      .then((data) => { setChartData(data); setLoading(false); })
      .catch((err) => { console.error(err); setError("Could not load stock data."); setLoading(false); });
  }, [ticker]);

  const firstPrice = chartData[0]?.close;
  const lastPrice = chartData[chartData.length - 1]?.close;
  const totalReturn = firstPrice && lastPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : null;
  const isPositive = totalReturn !== null && totalReturn >= 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ background: `${meta.color}22`, color: meta.color }}
            >
              M
            </div>
            <div>
              <span className="font-bold text-white text-lg tracking-tight">MarketLens</span>
              <span className="hidden sm:inline text-gray-500 text-sm ml-2">· Markets don't move in a vacuum</span>
            </div>
          </div>
          <div className="hidden sm:block text-xs text-gray-500">Powered by Yahoo Finance</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="mb-8">
          <TickerSearch currentTicker={ticker} onSelect={setTicker} />
        </div>

        {/* Stock Title & Stats */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-black tracking-tight" style={{ color: meta.color }}>
                {ticker}
              </h1>
              <span
                className="text-xs px-2 py-1 rounded-full border font-medium"
                style={{ borderColor: `${meta.color}40`, color: meta.color, background: `${meta.color}12` }}
              >
                {meta.sector}
              </span>
            </div>
            <p className="text-gray-400 text-sm">{meta.name}</p>
          </div>

          {lastPrice && (
            <div className="text-right">
              <div className="text-3xl font-bold text-white">${lastPrice.toFixed(2)}</div>
              {totalReturn !== null && (
                <div className={`flex items-center justify-end gap-1 text-sm font-semibold mt-0.5 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                  {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {isPositive ? "+" : ""}{totalReturn.toFixed(1)}% since Jan 2020
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chart Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 mb-4 relative">
          {/* Volatility filter bar */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800 flex-wrap">
            <span className="text-gray-400 text-xs font-semibold whitespace-nowrap">
              Big moves:
            </span>
            <div className="flex gap-1.5">
              {[0, 3, 5, 8, 12].map((v) => (
                <button
                  key={v}
                  onClick={() => setVolatilityThreshold(v)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all border ${
                    volatilityThreshold === v
                      ? "border-amber-500/60 text-amber-400 bg-amber-500/15"
                      : "border-gray-700 text-gray-500 hover:text-gray-300 bg-gray-800/50"
                  }`}
                >
                  {v === 0 ? "OFF" : `±${v}%`}
                </button>
              ))}
            </div>
            {volatilityThreshold > 0 && (
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#f59e0b" }} /> up
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#f97316" }} /> down
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div
                  className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
                  style={{ borderColor: `${meta.color}40`, borderTopColor: meta.color }}
                />
                <p className="text-gray-400 text-sm">Loading {ticker} history…</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center max-w-sm">
                <p className="text-red-400 text-sm mb-2">{error}</p>
                <p className="text-gray-500 text-xs">Make sure you have internet access.</p>
              </div>
            </div>
          ) : (
            <StockChart
              data={chartData}
              spyData={SPY_DATA}
              events={events}
              ticker={ticker}
              tickerColor={meta.color}
              volatilityThreshold={volatilityThreshold}
            />
          )}
        </div>

        {/* Legend + tip */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <EventLegend />
          <div className="flex items-center gap-3">
            {DATA_DATE && (
              <p className="text-gray-600 text-xs">Data as of {DATA_DATE}</p>
            )}
            <p className="text-gray-500 text-xs">
              Click any marker · Drag the brush below the chart to zoom
            </p>
          </div>
        </div>

        {/* Prediction + News */}
        {!loading && chartData.length > 0 && (
          <PredictionPanel ticker={ticker} chartData={chartData} tickerColor={meta.color} />
        )}

        {/* AI-curated events */}
        {!loading && <AIEventsPanel ticker={ticker} tickerColor={meta.color} />}

        {/* Event Timeline Grid */}
        {events.length > 0 && (
          <div className="mt-10">
            {/* Header + selection criteria toggle */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-300 font-semibold text-sm uppercase tracking-widest">
                Key Events · {ticker}
              </h2>
              <button
                onClick={() => setCriteriaOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <Info size={13} />
                Selection criteria
                {criteriaOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* Selection criteria panel */}
            {criteriaOpen && (
              <div className="mb-4 bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
                <p className="text-gray-200 font-semibold text-sm mb-3">How events are selected</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex gap-2">
                    <span className="text-emerald-400 font-bold shrink-0">$</span>
                    <div><span className="text-gray-200 font-medium">Earnings surprises</span> — results where revenue or EPS beat/missed consensus by 10%+, or guidance moved the stock ±5%+ the following day.</div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-red-400 font-bold shrink-0">!</span>
                    <div><span className="text-gray-200 font-medium">Market shocks</span> — macro crashes or sector-wide selloffs with a drawdown of 15%+ over days to weeks.</div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-blue-400 font-bold shrink-0">★</span>
                    <div><span className="text-gray-200 font-medium">Product launches</span> — new products that materially shifted competitive position or addressable market, causing a measurable re-rating.</div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-400 font-bold shrink-0">◆</span>
                    <div><span className="text-gray-200 font-medium">Macro events</span> — Fed actions, index inclusions, executive changes, or industry news that moved the stock ±5%+ independent of fundamentals.</div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-amber-400 font-bold shrink-0">⚖</span>
                    <div><span className="text-gray-200 font-medium">Regulatory actions</span> — government bans, export controls, or antitrust actions with direct impact on revenue or supply chain.</div>
                  </div>
                </div>
                <p className="text-gray-600 pt-3 mt-2 border-t border-gray-800">
                  Article counts are manually estimated based on each event's market significance — major crashes and index milestones typically generate thousands of articles; earnings and product launches typically generate hundreds.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {events.map((evt) => {
                const color = EVENT_COLORS[evt.type] || "#888";
                return (
                  <div key={evt.date}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${color}20`, color }}>
                        {evt.label}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {new Date(evt.date + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short", year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-gray-200 text-sm font-medium mb-1 leading-snug">{evt.headline}</p>
                    <p className="text-gray-400 text-xs leading-relaxed mb-3">{evt.impact}</p>
                    <div className="flex items-center justify-between">
                      {evt.sources && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Newspaper size={11} />
                          {evt.sources}
                        </span>
                      )}
                      <a
                        href={evt.articleUrl || `https://news.google.com/search?q=${encodeURIComponent(ticker + " " + evt.headline)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors ml-auto"
                      >
                        <ExternalLink size={11} />
                        Read on Reuters
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 mt-16 py-6 text-center text-xs text-gray-600">
        MarketLens · For educational purposes only · Not financial advice
      </footer>
    </div>
  );
}
