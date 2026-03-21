import { useState, useCallback, useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from "recharts";
import { EVENT_COLORS } from "../data/events";
import EventPopover from "./EventPopover";

const RANGES = ["1M", "3M", "6M", "1Y", "2Y", "MAX"];

function cutoffDate(range) {
  const now = new Date();
  switch (range) {
    case "1M": now.setMonth(now.getMonth() - 1); break;
    case "3M": now.setMonth(now.getMonth() - 3); break;
    case "6M": now.setMonth(now.getMonth() - 6); break;
    case "1Y": now.setFullYear(now.getFullYear() - 1); break;
    case "2Y": now.setFullYear(now.getFullYear() - 2); break;
    default: return null;
  }
  return now.toISOString().split("T")[0];
}

function ChartDot({ cx, cy, payload, eventDateMap, volatileDates, volatilityThreshold,
                    onEventClick, onVolatileClick, activeDate }) {
  if (!payload?.date || cx == null || cy == null) return null;
  const evt = eventDateMap[payload.date];
  const vInfo = volatileDates[payload.date];

  if (evt) {
    const isActive = activeDate === evt.date;
    const color = EVENT_COLORS[evt.type] || "#ffffff";
    return (
      <g>
        <circle cx={cx} cy={cy} r={isActive ? 11 : 8} fill={color}
          stroke="#0f1117" strokeWidth={2} style={{ cursor: "pointer" }}
          onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
        />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={9} fill="#fff" fontWeight="bold" style={{ pointerEvents: "none" }}>
          {evt.type === "earnings" ? "$" : evt.type === "crash" ? "!" :
           evt.type === "product" ? "★" : evt.type === "regulatory" ? "⚖" : "◆"}
        </text>
      </g>
    );
  }

  if (vInfo && volatilityThreshold > 0) {
    const isUp = vInfo.change >= 0;
    const color = isUp ? "#f59e0b" : "#f97316";
    const isActive = activeDate === payload.date;
    return (
      <g>
        <circle cx={cx} cy={cy} r={isActive ? 9 : 6} fill={color}
          stroke="#0f1117" strokeWidth={1.5} style={{ cursor: "pointer" }}
          onClick={(e) => { e.stopPropagation(); onVolatileClick(payload.date, vInfo); }}
        />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={8} fill="#000" fontWeight="bold" style={{ pointerEvents: "none" }}>
          {isUp ? "▲" : "▼"}
        </text>
      </g>
    );
  }
  return null;
}

const CustomTooltip = ({ active, payload, label, volatileDates, volatilityThreshold, showSpy, ticker }) => {
  if (!active || !payload?.length) return null;
  const vInfo = volatileDates?.[label];
  const tickerEntry = payload.find((p) => p.dataKey === (showSpy ? "indexed" : "close"));
  const spyEntry = payload.find((p) => p.dataKey === "spyIndexed");

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-xl min-w-32">
      <p className="text-gray-400 text-xs mb-1.5">{label}</p>
      {tickerEntry && (
        <p className="text-white font-semibold">
          {showSpy ? `${ticker}: ${tickerEntry.value?.toFixed(1)}` : `$${tickerEntry.value?.toFixed(2)}`}
        </p>
      )}
      {spyEntry && showSpy && (
        <p className="text-gray-300 text-xs mt-0.5">S&P 500: {spyEntry.value?.toFixed(1)}</p>
      )}
      {showSpy && tickerEntry && spyEntry && (
        <p className={`text-xs mt-1 font-semibold ${(tickerEntry.value - spyEntry.value) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          vs S&P: {(tickerEntry.value - spyEntry.value) >= 0 ? "+" : ""}{(tickerEntry.value - spyEntry.value).toFixed(1)}
        </p>
      )}
      {vInfo && volatilityThreshold > 0 && !showSpy && (
        <p className={`text-xs font-semibold mt-0.5 ${vInfo.change >= 0 ? "text-amber-400" : "text-orange-400"}`}>
          {vInfo.change >= 0 ? "▲" : "▼"} {Math.abs(vInfo.change).toFixed(2)}% weekly move
        </p>
      )}
    </div>
  );
};

// Snap each event to the nearest weekly data point (±6 days)
function buildEventDateMap(events, dataPoints) {
  const map = {}; // dataPoint.date → event
  for (const evt of events) {
    const evtMs = new Date(evt.date + "T00:00:00").getTime();
    let closest = null;
    let closestDiff = Infinity;
    for (const dp of dataPoints) {
      const diff = Math.abs(new Date(dp.date + "T00:00:00").getTime() - evtMs);
      if (diff < closestDiff && diff <= 6 * 86400000) {
        closestDiff = diff;
        closest = dp.date;
      }
    }
    if (closest) map[closest] = evt;
  }
  return map;
}

export default function StockChart({ data, spyData, events, ticker, tickerColor, volatilityThreshold = 0 }) {
  const [activeEvent, setActiveEvent] = useState(null);
  const [activeVolatile, setActiveVolatile] = useState(null);
  const [dateRange, setDateRange] = useState("MAX");
  const [showSpy, setShowSpy] = useState(false);

  const filteredData = useMemo(() => {
    const cutoff = cutoffDate(dateRange);
    if (!cutoff) return data;
    return data.filter((d) => d.date >= cutoff);
  }, [data, dateRange]);

  // Merge SPY as indexed comparison (both = 100 at start of visible range)
  const chartData = useMemo(() => {
    const base = filteredData[0]?.close;
    if (!showSpy || !spyData || !base) {
      return filteredData.map((d) => ({ ...d, indexed: base ? +(d.close / base * 100).toFixed(2) : null }));
    }
    const spyMap = {};
    spyData.forEach((d) => { spyMap[d.date] = d.close; });
    // Find SPY base at or after start date
    const startDate = filteredData[0].date;
    const spyBase = spyMap[startDate] ?? spyData.find((s) => s.date >= startDate)?.close;

    return filteredData.map((d) => ({
      ...d,
      indexed: +(d.close / base * 100).toFixed(2),
      spyIndexed: spyBase && spyMap[d.date] ? +(spyMap[d.date] / spyBase * 100).toFixed(2) : null,
    }));
  }, [filteredData, spyData, showSpy]);

  // Map each event to its nearest weekly data point
  const eventDateMap = useMemo(
    () => buildEventDateMap(events, filteredData),
    [events, filteredData]
  );

  const volatileDates = useMemo(() => {
    if (volatilityThreshold <= 0) return {};
    const result = {};
    for (let i = 1; i < filteredData.length; i++) {
      const prev = filteredData[i - 1].close;
      const curr = filteredData[i].close;
      if (!prev || !curr) continue;
      const pct = ((curr - prev) / prev) * 100;
      if (Math.abs(pct) >= volatilityThreshold) {
        result[filteredData[i].date] = { change: pct, price: curr, prevPrice: prev };
      }
    }
    return result;
  }, [filteredData, volatilityThreshold]);

  const handleEventClick = useCallback((evt) => {
    setActiveVolatile(null);
    setActiveEvent((prev) => (prev?.date === evt.date ? null : evt));
  }, []);

  const handleVolatileClick = useCallback((date, info) => {
    setActiveEvent(null);
    setActiveVolatile((prev) => (prev?.date === date ? null : { date, ...info }));
  }, []);

  const closeAll = useCallback(() => { setActiveEvent(null); setActiveVolatile(null); }, []);

  if (!chartData || chartData.length === 0) {
    return <div className="flex items-center justify-center h-80 text-gray-500">No data available</div>;
  }

  const activeKey = showSpy ? "indexed" : "close";
  const allVals = chartData.map((d) => d[activeKey]).filter(Boolean);
  const spyVals = showSpy ? chartData.map((d) => d.spyIndexed).filter(Boolean) : [];
  const minPrice = Math.min(...allVals, ...spyVals) * 0.95;
  const maxPrice = Math.max(...allVals, ...spyVals) * 1.03;

  const formatXAxis = (tick) => {
    if (!tick) return "";
    const d = new Date(tick + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  const formatYAxis = (val) => {
    if (showSpy) return val.toFixed(0);
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    return `$${Math.round(val)}`;
  };

  const volatileCount = Object.keys(volatileDates).length;

  // Compute outperformance vs S&P 500
  const lastIndexed = chartData[chartData.length - 1]?.indexed;
  const lastSpy = chartData[chartData.length - 1]?.spyIndexed;
  const outperformance = showSpy && lastIndexed && lastSpy ? (lastIndexed - lastSpy).toFixed(1) : null;

  return (
    <div className="relative w-full">
      {/* Controls row */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button key={r}
              onClick={(e) => { e.stopPropagation(); setDateRange(r); }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                dateRange === r ? "text-white" : "text-gray-500 hover:text-gray-300 bg-gray-800/50"
              }`}
              style={dateRange === r ? { background: `${tickerColor}30`, color: tickerColor } : {}}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* S&P 500 toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowSpy((v) => !v); }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
              showSpy
                ? "border-gray-400/50 text-gray-200 bg-gray-700/50"
                : "border-gray-700 text-gray-500 hover:text-gray-300 bg-gray-800/50"
            }`}
          >
            <span className="w-3 h-0.5 bg-gray-400 inline-block rounded" style={{ borderTop: "2px dashed #9ca3af", width: 14, height: 0 }} />
            vs S&P 500
          </button>

          {/* Outperformance badge */}
          {outperformance !== null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              parseFloat(outperformance) >= 0
                ? "text-emerald-400 bg-emerald-400/10"
                : "text-red-400 bg-red-400/10"
            }`}>
              {parseFloat(outperformance) >= 0 ? "+" : ""}{outperformance} vs S&P
            </span>
          )}

          {/* Volatile count badge */}
          {volatilityThreshold > 0 && volatileCount > 0 && (
            <span className="text-xs text-amber-400 font-semibold">
              {volatileCount} moves ≥ {volatilityThreshold}%
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={typeof window !== "undefined" && window.innerWidth < 640 ? 280 : 400}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatXAxis}
            tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={{ stroke: "#1e2433" }}
            tickLine={false} interval="preserveStartEnd" minTickGap={60}
          />
          <YAxis domain={[minPrice, maxPrice]} tickFormatter={formatYAxis}
            tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={60}
            label={showSpy ? { value: "Indexed (100 = start)", angle: -90, position: "insideLeft",
              offset: 10, style: { fill: "#4b5563", fontSize: 10 } } : undefined}
          />
          <Tooltip content={
            <CustomTooltip volatileDates={volatileDates} volatilityThreshold={volatilityThreshold}
              showSpy={showSpy} ticker={ticker} />
          } />

          {Object.entries(eventDateMap).map(([snapDate, evt]) => (
              <ReferenceLine key={snapDate} x={snapDate}
                stroke={EVENT_COLORS[evt.type] || "#888"}
                strokeDasharray="4 4" strokeOpacity={0.35} strokeWidth={1}
              />
          ))}

          {/* S&P 500 line */}
          {showSpy && (
            <Line type="monotone" dataKey="spyIndexed" stroke="#9ca3af"
              strokeWidth={1.5} strokeDasharray="5 3" dot={false}
              name="S&P 500" activeDot={{ r: 3, fill: "#9ca3af" }}
            />
          )}

          {/* Ticker line */}
          <Line type="monotone" dataKey={activeKey} stroke={tickerColor}
            strokeWidth={2} name={ticker}
            dot={(props) => (
              <ChartDot key={props.payload?.date} {...props}
                eventDateMap={eventDateMap} volatileDates={volatileDates}
                volatilityThreshold={volatilityThreshold}
                onEventClick={handleEventClick} onVolatileClick={handleVolatileClick}
                activeDate={activeEvent?.date || activeVolatile?.date}
              />
            )}
            activeDot={{ r: 4, fill: tickerColor }}
          />

          <Brush dataKey="date" height={28} stroke="#2d3748" fill="#1a202c"
            travellerWidth={6} tickFormatter={formatXAxis}>
            <Line dataKey={activeKey} stroke={tickerColor} strokeWidth={1} dot={false} />
          </Brush>
        </ComposedChart>
      </ResponsiveContainer>

      {/* Transparent backdrop — click anywhere outside popover to close */}
      {(activeEvent || activeVolatile) && (
        <div className="absolute inset-0 z-40" onClick={closeAll} />
      )}

      {activeEvent && <EventPopover event={activeEvent} onClose={closeAll} ticker={ticker} />}

      {activeVolatile && !activeEvent && (
        <div className="absolute bottom-16 right-4 z-50 w-64 rounded-xl shadow-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #141820 100%)",
            border: `1px solid ${activeVolatile.change >= 0 ? "#f59e0b" : "#f97316"}40` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1 w-full" style={{ background: activeVolatile.change >= 0 ? "#f59e0b" : "#f97316" }} />
          <div className="p-4">
            <p className="text-gray-400 text-xs mb-1">{activeVolatile.date}</p>
            <p className="text-white font-bold text-base mb-1">
              {activeVolatile.change >= 0 ? "▲" : "▼"} {Math.abs(activeVolatile.change).toFixed(2)}% weekly
            </p>
            <p className="text-gray-300 text-sm">
              ${activeVolatile.prevPrice?.toFixed(2)} → ${activeVolatile.price?.toFixed(2)}
            </p>
            <a href={`https://news.google.com/search?q=${encodeURIComponent(ticker + " stock " + activeVolatile.date)}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
              🔍 What moved it?
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
