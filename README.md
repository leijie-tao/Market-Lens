# MarketLens

> Markets don't move in a vacuum — see what was happening when prices moved

MarketLens is a stock history visualization tool that lets you see **what the price did** and **what was happening in the world** on the same chart.

---

## Live Demo

Deployed on Vercel — link coming soon

---

## Features

- **Historical price chart** — weekly line chart with 1M / 3M / 6M / 1Y / 2Y / MAX range selector
- **Event markers** — earnings, product launches, regulatory actions, market crashes, and macro events annotated on the chart; click any marker for details
- **vs S&P 500 comparison** — toggle a normalized index view to see how much the stock outperformed or underperformed the market
- **Big moves filter** — highlight weekly moves above a chosen threshold (±3% / 5% / 8% / 12%)
- **Signal panel** — heuristic score based on recent events and price momentum (for learning only, not investment advice)
- **Live news** — pulls the latest headlines from Yahoo Finance
- **AI event discovery** — provide your own Claude API key and let AI surface the biggest market-moving events for any ticker and time range

---

## Getting Started

### Prerequisites

- Node.js 18 or higher (recommended: use [nvm](https://github.com/nvm-sh/nvm))

### Install and run

```bash
# Clone the repo
git clone https://github.com/leijie-tao/Market-Lens.git
cd Market-Lens

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build
```

---

## Updating price data

Price data is bundled into `src/data/priceData.json` at build time and does not update automatically. To refresh it:

```bash
node scripts/fetchPriceData.mjs
```

This fetches weekly price history for NVDA, TSLA, AMZN, META, AAPL, MSFT, and SPY from Yahoo Finance and overwrites `priceData.json`. Redeploy after running the script for changes to take effect.

---

## Supported tickers

The current version supports the following 6 tickers (plus SPY as the market benchmark):

| Ticker | Company |
|--------|---------|
| NVDA | NVIDIA |
| TSLA | Tesla |
| AMZN | Amazon |
| META | Meta Platforms |
| AAPL | Apple |
| MSFT | Microsoft |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 8 |
| Charts | Recharts 3 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| AI | Anthropic Claude API (claude-haiku-4-5) |
| Data | Yahoo Finance (fetched by script, bundled at build time) |
| Deployment | Vercel |

---

## Disclaimer

This project is **for educational and learning purposes only**.

- All data is historical and does not represent real-time market data
- The Signal score is a heuristic rule, not a model prediction
- Nothing on this site constitutes investment advice

---

## Docs

- [Product Requirements](docs/REQUIREMENTS.md) — feature priorities and backlog
- [Development Plan](docs/DEVELOPMENT_PLAN.md) — roadmap and step-by-step guide
