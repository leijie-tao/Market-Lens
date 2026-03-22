import { useState } from "react";
import { Search, Clock } from "lucide-react";
import { TICKER_META } from "../data/events";

const QUICK_PICKS = Object.keys(TICKER_META);
const STORAGE_KEY = "ml_recent";
const MAX_RECENT = 5;

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function TickerSearch({ currentTicker, onSelect }) {
  const [inputVal, setInputVal] = useState("");
  const [error, setError] = useState("");
  const [recent, setRecent] = useState(loadRecent);

  const handleSelect = (ticker) => {
    setRecent((prev) => {
      const updated = [ticker, ...prev.filter((t) => t !== ticker)].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    onSelect(ticker);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = inputVal.trim().toUpperCase();
    if (!val) return;
    if (!TICKER_META[val]) {
      setError(`"${val}" not in demo set. Try: ${QUICK_PICKS.join(", ")}`);
      return;
    }
    setError("");
    setInputVal("");
    handleSelect(val);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value.toUpperCase());
              setError("");
            }}
            placeholder="Enter ticker (e.g. NVDA)"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-500"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Go
        </button>
      </form>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Recently visited */}
      {recent.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="flex items-center gap-1 text-gray-600 text-xs">
            <Clock size={11} />
            Recent
          </span>
          {recent.map((t) => {
            const meta = TICKER_META[t];
            const isActive = t === currentTicker;
            return (
              <button
                key={t}
                onClick={() => handleSelect(t)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all border ${
                  isActive
                    ? "border-transparent"
                    : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 bg-gray-800/60"
                }`}
                style={
                  isActive
                    ? { background: `${meta.color}22`, borderColor: `${meta.color}66`, color: meta.color }
                    : {}
                }
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      {/* Quick picks */}
      <div className="flex gap-2 flex-wrap justify-center">
        {QUICK_PICKS.map((t) => {
          const meta = TICKER_META[t];
          const isActive = t === currentTicker;
          return (
            <button
              key={t}
              onClick={() => handleSelect(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                isActive
                  ? "border-transparent text-white shadow-lg scale-105"
                  : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 bg-gray-800"
              }`}
              style={
                isActive
                  ? {
                      background: `${meta.color}22`,
                      borderColor: `${meta.color}66`,
                      color: meta.color,
                    }
                  : {}
              }
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
