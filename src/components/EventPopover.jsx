import { X, ExternalLink, Newspaper } from "lucide-react";
import { EVENT_COLORS } from "../data/events";

const TYPE_LABELS = {
  earnings: "Earnings",
  macro: "Macro Event",
  product: "Product Launch",
  crash: "Market Shock",
  regulatory: "Regulatory",
};

const TYPE_ICONS = {
  earnings: "💰",
  macro: "🌐",
  product: "🚀",
  crash: "⚠️",
  regulatory: "⚖️",
};

export default function EventPopover({ event, onClose, ticker }) {
  if (!event) return null;

  const color = EVENT_COLORS[event.type] || "#888";
  const typeLabel = TYPE_LABELS[event.type] || event.type;
  const icon = TYPE_ICONS[event.type] || "●";

  const formattedDate = new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const fallbackSearch = `https://news.google.com/search?q=${encodeURIComponent(`${ticker} ${event.headline}`)}`;

  return (
    <div
      className="absolute bottom-4 right-4 z-50 w-80 rounded-xl shadow-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a1f2e 0%, #141820 100%)",
        border: `1px solid ${color}40`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="h-1 w-full" style={{ background: color }} />

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${color}25`, color }}>
            {icon} {typeLabel}
          </span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-gray-400 text-xs mb-2">{formattedDate}</p>
        <h3 className="text-white font-bold text-base mb-2 leading-tight">{event.label}</h3>
        <p className="text-gray-300 text-sm mb-3 leading-relaxed">{event.headline}</p>

        <div className="rounded-lg p-3 mb-3"
          style={{ background: `${color}12`, borderLeft: `3px solid ${color}` }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color }}>
            Market Impact
          </p>
          <p className="text-gray-200 text-sm leading-relaxed">{event.impact}</p>
        </div>

        {/* Source count + article link */}
        <div className="flex items-center justify-between">
          {event.sources && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Newspaper size={11} />
              {event.sources}
            </span>
          )}
          <a
            href={event.articleUrl || fallbackSearch}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ExternalLink size={12} />
            Read on Reuters
          </a>
        </div>
      </div>
    </div>
  );
}
