import { EVENT_COLORS } from "../data/events";

const LEGEND_ITEMS = [
  { type: "earnings", label: "Earnings", icon: "$" },
  { type: "product", label: "Product", icon: "★" },
  { type: "macro", label: "Macro", icon: "◆" },
  { type: "crash", label: "Shock", icon: "!" },
  { type: "regulatory", label: "Regulatory", icon: "⚖" },
];

export default function EventLegend() {
  return (
    <div className="flex gap-4 flex-wrap justify-center">
      {LEGEND_ITEMS.map(({ type, label, icon }) => (
        <div key={type} className="flex items-center gap-1.5 text-xs text-gray-400">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-xs"
            style={{ background: EVENT_COLORS[type] }}
          >
            {icon}
          </div>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
