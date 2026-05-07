# 📈 TradeX — Advanced Trading Dashboard

> A professional-grade, frontend-only trading terminal built for **ACES Webathon 2026**.

![TradeX Banner](https://img.shields.io/badge/TradeX-Webathon%202026-0ecb81?style=for-the-badge&logo=bitcoin&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)

---

## 🚀 Features

### 🔐 Authentication
- Local-storage-based login system
- Password validation (uppercase, lowercase, number, special character)
- Session persists across page refreshes
- **Demo credentials:** `nikhil6273` / `Nikhil@1`

### 📊 Market Pulse Chart
- Powered by **lightweight-charts v5** (institutional-grade charting library)
- Switch between **Candlestick**, **Line**, and **Area** chart types via dropdown
- Real-time simulated OHLC price updates tracking live Binance data
- Professional dark-themed grid and axis styling

### 📖 Live Order Book (Simulated)
- High-frequency bid/ask simulation around the live asset price
- Visual depth bars with smooth CSS transitions
- Updates every 3.5 seconds with realistic market depth

### 🧩 Drag-and-Drop Dashboard
- Fully customizable panel layout — drag panels to reorder
- Layout persists across sessions using `localStorage`
- All panels: Market Pulse, Order Book, Top Gainers/Losers, Watchlist, News, Heatmap, AI Assistant, Alerts

### ⌨️ Command Palette (Ctrl+K)
- MacOS-style spotlight overlay
- Execute commands like "Go to Portfolio", "Switch to Dark Theme", "Buy 10 BTC"
- Instant fuzzy search filtering

### 💹 Crypto & Stocks Mode
- Toggle between **Crypto** (live Binance WebSocket prices) and **Stocks** (simulated)
- Watchlist and dashboard automatically filter by active mode

### 📱 Social Copy Trading
- Leaderboard of mock traders with portfolio allocations
- Click any trader to copy their allocation instantly

### 🗺️ Guided Onboarding Tour
- First-visit interactive tour powered by **driver.js**
- Highlights key features: Chart, Order Book, Copy Trading, Drag & Drop

### 🌗 Light / Dark Theme
- Full dark mode (Binance-style) and light mode support
- All components respect CSS variables — no hardcoded colors

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 18 + TypeScript** | Core UI framework |
| **Vite 6** | Build tool & dev server |
| **lightweight-charts v5** | Professional candlestick/line/area charts |
| **Recharts** | Portfolio pie chart, area chart, bar chart |
| **Framer Motion** | Smooth page transitions & animations |
| **React Three Fiber + Drei** | 3D hero scene with animated coins |
| **driver.js** | Interactive guided tour |
| **Lucide React** | Icon library |
| **React Router v6** | Client-side routing |

---

## 🏗️ Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/Nikhil62738/Webathon.git
cd Webathon

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

---

## 📂 Project Structure

```
src/
├── App.tsx          # Main application — all components in one file
├── styles.css       # Global styles & CSS variables
├── main.tsx         # React entry point
└── vite-env.d.ts    # Vite type declarations
```

---

## 🔑 Demo Login

| Field    | Value      |
|----------|------------|
| Username | `nikhil6273` |
| Password | `Nikhil@1` |

> Password rules: must contain uppercase, lowercase, number & special character.

---

## 📸 Pages

| Route | Description |
|---|---|
| `/` | Main Dashboard |
| `/asset/:symbol` | Individual asset trading desk |
| `/portfolio` | Portfolio overview with allocation pie chart |
| `/orders` | Order history with filters |
| `/settings` | Theme, currency, and notification settings |

---

## ⚡ Live Data

- **Crypto prices** stream from the **Binance public REST & WebSocket API** (no API key required)
- **Stocks** use realistic simulated prices
- All trades, holdings, orders, and watchlist are stored in **`localStorage`** — no backend needed

---

## 👨‍💻 Author

**Nikhil Chopade**  
ACES Webathon 2026

---

## 📄 License

This project is for educational/competition purposes.
