import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Stars } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bot,
  Briefcase,
  CandlestickChart,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  GripVertical,
  Gauge,
  Flame,
  History,
  LayoutDashboard,
  Moon,
  Play,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  Wallet,
  X,
} from "lucide-react";
import React, { Suspense, useEffect, useMemo, useRef, useState, Fragment } from "react";
import type * as THREE from "three";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { createChart, CandlestickSeries, LineSeries, AreaSeries } from "lightweight-charts";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Asset = {
  symbol: string;
  base: string;
  name: string;
  kind: "crypto" | "stock";
  price: number;
  change: number;
  volume: number;
  high: number;
  low: number;
};

type Holding = {
  symbol: string;
  qty: number;
  avgPrice: number;
};

type Order = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  orderType?: "Market" | "Limit" | "Stop-loss" | "Take-profit";
  triggerPrice?: number;
  qty: number;
  price: number;
  total: number;
  status: "Completed" | "Pending" | "Failed";
  date: string;
};

type PriceAlert = {
  id: string;
  symbol: string;
  target: number;
  direction: "above" | "below";
  active: boolean;
};

type Preferences = {
  theme: "dark" | "light";
  animations: boolean;
  alerts: boolean;
  chartStyle: "Area" | "Bars";
  currency: "USD" | "INR";
};

const CRYPTO_SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT"];
const STOCKS = [
  { symbol: "AAPL", base: "AAPL", name: "Apple", price: 187, change: 1.2, volume: 81230000, high: 190, low: 184 },
  { symbol: "TSLA", base: "TSLA", name: "Tesla", price: 176, change: -0.8, volume: 103000000, high: 181, low: 172 },
  { symbol: "NVDA", base: "NVDA", name: "Nvidia", price: 921, change: 2.7, volume: 69000000, high: 935, low: 901 },
  { symbol: "MSFT", base: "MSFT", name: "Microsoft", price: 417, change: 0.6, volume: 28400000, high: 421, low: 413 },
];

const fallbackAssets: Asset[] = CRYPTO_SYMBOLS.map((symbol, index) => {
  const prices = [67300, 3430, 585, 147, 0.53, 0.45, 0.16, 39, 17, 7.3];
  const base = symbol.replace("USDT", "");
  return {
    symbol,
    base,
    name: `${base} / USDT`,
    kind: "crypto",
    price: prices[index],
    change: [1.8, -0.7, 2.2, 4.1, -1.3, 0.9, -2.4, 3.2, 1.1, -0.2][index],
    volume: 1000000 + index * 230000,
    high: prices[index] * 1.035,
    low: prices[index] * 0.965,
  };
});

const rupeeRate = 83.4;
const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

function formatMoney(value: number, currency: Preferences["currency"] = "USD") {
  const converted = currency === "INR" ? value * rupeeRate : value;
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: converted > 1000 ? 0 : 2,
  }).format(converted);
}

function formatNumber(value: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildChart(price: number, range: string) {
  const points = range === "1D" ? 36 : range === "1W" ? 48 : 60;
  let last = price * (range === "1M" ? 0.92 : range === "1W" ? 0.97 : 0.99);
  return Array.from({ length: points }, (_, i) => {
    last = Math.max(0.01, last * (1 + (Math.random() - 0.46) * 0.012));
    return {
      time: range === "1D" ? `${String(i % 24).padStart(2, "0")}:00` : `D${i + 1}`,
      price: Number(last.toFixed(price > 100 ? 2 : 4)),
      volume: Math.round(200 + Math.random() * 1000),
    };
  });
}

function Coin({ color = "#f5b841", position = [0, 0, 0] as [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.7;
      ref.current.rotation.x += delta * 0.16;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1.4}>
      <mesh ref={ref} position={position}>
        <cylinderGeometry args={[0.7, 0.7, 0.12, 64]} />
        <meshStandardMaterial color={color} metalness={0.75} roughness={0.18} />
      </mesh>
    </Float>
  );
}

function MarketScene() {
  const app = useApp();
  return (
    <Canvas camera={{ position: [0, 1.2, 5], fov: 44 }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 4, 4]} intensity={2.2} color="#54f3a6" />
      <pointLight position={[-3, -2, 2]} intensity={1.2} color="#4aa3ff" />
      {app.preferences.theme === "dark" && <Stars radius={42} depth={24} count={1200} factor={2} fade speed={0.5} />}
      <Suspense fallback={null}>
        <Coin position={[-1.4, 0.45, 0]} color="#f8c24a" />
        <Coin position={[1.25, -0.15, -0.35]} color="#51d4ff" />
        <Coin position={[0.15, -0.7, 0.55]} color="#86efac" />
        <mesh rotation={[0.5, 0.2, 0]}>
          <torusKnotGeometry args={[0.95, 0.025, 140, 12]} />
          <meshStandardMaterial color="#65f5d4" emissive="#0f766e" metalness={0.4} />
        </mesh>
      </Suspense>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
    </Canvas>
  );
}

function useTradeX() {
  const [preferences, setPreferences] = useState<Preferences>(() =>
    storage.get("tradex-preferences", { theme: "dark", animations: true, alerts: true, chartStyle: "Area", currency: "USD" })
  );
  const [assets, setAssets] = useState<Asset[]>(fallbackAssets);
  const [mode, setMode] = useState<"crypto" | "stock">("crypto");
  const [holdings, setHoldings] = useState<Holding[]>(() => storage.get("tradex-holdings", []));
  const [orders, setOrders] = useState<Order[]>(() => storage.get("tradex-orders", []));
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => storage.get("tradex-alerts", []));
  const [watchlist, setWatchlist] = useState<string[]>(() => storage.get("tradex-watchlist", ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"]));
  const [cash, setCash] = useState(() => storage.get("tradex-cash", 100000));
  const [toast, setToast] = useState<string | null>(null);
  const [apiMode, setApiMode] = useState<"live" | "fallback">("live");

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.motion = preferences.animations ? "on" : "off";
    storage.set("tradex-preferences", preferences);
  }, [preferences]);

  useEffect(() => storage.set("tradex-holdings", holdings), [holdings]);
  useEffect(() => storage.set("tradex-orders", orders), [orders]);
  useEffect(() => storage.set("tradex-alerts", alerts), [alerts]);
  useEffect(() => storage.set("tradex-watchlist", watchlist), [watchlist]);
  useEffect(() => storage.set("tradex-cash", cash), [cash]);

  useEffect(() => {
    let cancelled = false;
    async function loadMarket() {
      try {
        const response = await fetch("https://api.binance.com/api/v3/ticker/24hr");
        if (!response.ok) throw new Error("Binance REST failed");
        const tickers = await response.json();
        if (cancelled) return;
        const next = CRYPTO_SYMBOLS.map((symbol) => {
          const row = tickers.find((item: { symbol: string }) => item.symbol === symbol);
          const fallback = fallbackAssets.find((asset) => asset.symbol === symbol)!;
          return row
            ? {
                symbol,
                base: symbol.replace("USDT", ""),
                name: `${symbol.replace("USDT", "")} / USDT`,
                kind: "crypto" as const,
                price: Number(row.lastPrice),
                change: Number(row.priceChangePercent),
                volume: Number(row.quoteVolume),
                high: Number(row.highPrice),
                low: Number(row.lowPrice),
              }
            : fallback;
        });
        setAssets(next);
        setApiMode("live");
      } catch {
        setApiMode("fallback");
        setToast("Live API unavailable. Using simulated market mode.");
      }
    }
    loadMarket();
    const id = window.setInterval(loadMarket, 45000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (mode !== "crypto") return;
    const symbols = CRYPTO_SYMBOLS.map((symbol) => `${symbol.toLowerCase()}@miniTicker`).join("/");
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${symbols}`);
      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data).data;
        setAssets((current) =>
          current.map((asset) =>
            asset.symbol === payload.s
              ? {
                  ...asset,
                  price: Number(payload.c),
                  volume: Number(payload.q),
                  high: Number(payload.h),
                  low: Number(payload.l),
                  change: ((Number(payload.c) - Number(payload.o)) / Number(payload.o)) * 100,
                }
              : asset
          )
        );
      };
      socket.onerror = () => setApiMode("fallback");
    } catch {
      setApiMode("fallback");
    }
    return () => socket?.close();
  }, [mode]);

  useEffect(() => {
    if (apiMode !== "fallback" && mode === "crypto") return;
    const id = window.setInterval(() => {
      setAssets((current) =>
        current.map((asset) => {
          const drift = (Math.random() - 0.48) * 0.01;
          const price = Math.max(0.01, asset.price * (1 + drift));
          return { ...asset, price, change: asset.change + drift * 100, high: Math.max(asset.high, price), low: Math.min(asset.low, price) };
        })
      );
    }, 2200);
    return () => window.clearInterval(id);
  }, [apiMode, mode]);

  const activeAssets: Asset[] = mode === "crypto" ? assets : STOCKS.map((stock) => ({ ...stock, kind: "stock" as const }));
  const portfolio = holdings.reduce(
    (acc, holding) => {
      const asset = [...assets, ...STOCKS.map((stock) => ({ ...stock, kind: "stock" as const }))].find((item) => item.symbol === holding.symbol);
      const price = asset?.price ?? holding.avgPrice;
      const value = holding.qty * price;
      const cost = holding.qty * holding.avgPrice;
      return { value: acc.value + value, cost: acc.cost + cost, pnl: acc.pnl + value - cost };
    },
    { value: 0, cost: 0, pnl: 0 }
  );
  const exposure = holdings.map((holding) => {
    const asset = [...assets, ...STOCKS.map((stock) => ({ ...stock, kind: "stock" as const }))].find((item) => item.symbol === holding.symbol);
    return holding.qty * (asset?.price ?? holding.avgPrice);
  });
  const concentration = exposure.length ? Math.max(...exposure) / Math.max(portfolio.value, 1) : 0;
  const avgVolatility = assets.reduce((sum, asset) => sum + Math.abs(asset.change), 0) / Math.max(assets.length, 1);
  const drawdown = portfolio.cost ? Math.max(0, -portfolio.pnl / portfolio.cost) : 0;
  const riskScore = Math.min(100, Math.round(concentration * 45 + avgVolatility * 8 + drawdown * 120));

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }

  function trade(symbol: string, side: "BUY" | "SELL", qty: number, orderType: Order["orderType"] = "Market", triggerPrice?: number) {
    const asset = [...assets, ...STOCKS.map((stock) => ({ ...stock, kind: "stock" as const }))].find((item) => item.symbol === symbol);
    if (!asset || qty <= 0) return false;
    if (orderType !== "Market") {
      const price = triggerPrice || asset.price;
      setOrders((current) => [
        { id: uid(), symbol, side, qty, price, triggerPrice: price, total: qty * price, status: "Pending", orderType, date: new Date().toISOString() },
        ...current,
      ]);
      notify(`${orderType} ${side.toLowerCase()} order queued for ${asset.base}.`);
      return true;
    }
    const total = qty * asset.price;
    if (side === "BUY" && total > cash) {
      notify("Not enough fake balance for this trade.");
      return false;
    }
    const existing = holdings.find((holding) => holding.symbol === symbol);
    if (side === "SELL" && (!existing || existing.qty < qty)) {
      notify("You do not have enough quantity to sell.");
      return false;
    }
    setCash((value) => (side === "BUY" ? value - total : value + total));
    setHoldings((current) => {
      const currentHolding = current.find((holding) => holding.symbol === symbol);
      if (side === "BUY") {
        if (!currentHolding) return [...current, { symbol, qty, avgPrice: asset.price }];
        return current.map((holding) =>
          holding.symbol === symbol
            ? { ...holding, qty: holding.qty + qty, avgPrice: (holding.avgPrice * holding.qty + total) / (holding.qty + qty) }
            : holding
        );
      }
      return current
        .map((holding) => (holding.symbol === symbol ? { ...holding, qty: holding.qty - qty } : holding))
        .filter((holding) => holding.qty > 0.000001);
    });
    setOrders((current) => [
      { id: uid(), symbol, side, qty, price: asset.price, total, status: "Completed", orderType, date: new Date().toISOString() },
      ...current,
    ]);
    notify(`${side === "BUY" ? "Bought" : "Sold"} ${qty} ${asset.base}`);
    return true;
  }

  useEffect(() => {
    if (!preferences.alerts) return;
    const triggered = alerts.filter((alert) => {
      const asset = [...assets, ...STOCKS.map((stock) => ({ ...stock, kind: "stock" as const }))].find((item) => item.symbol === alert.symbol);
      if (!asset || !alert.active) return false;
      return alert.direction === "above" ? asset.price >= alert.target : asset.price <= alert.target;
    });
    if (!triggered.length) return;
    setAlerts((current) => current.map((alert) => (triggered.some((item) => item.id === alert.id) ? { ...alert, active: false } : alert)));
    notify(`${triggered[0].symbol} alert triggered ${triggered[0].direction} ${formatMoney(triggered[0].target, preferences.currency)}.`);
  }, [assets, alerts, preferences.alerts, preferences.currency]);

  useEffect(() => {
    const pending = orders.filter((order) => order.status === "Pending");
    const market = [...assets, ...STOCKS.map((stock) => ({ ...stock, kind: "stock" as const }))];
    const triggered = pending.filter((order) => {
      const asset = market.find((item) => item.symbol === order.symbol);
      if (!asset || !order.triggerPrice) return false;
      if (order.orderType === "Limit") return order.side === "BUY" ? asset.price <= order.triggerPrice : asset.price >= order.triggerPrice;
      if (order.orderType === "Stop-loss") return asset.price <= order.triggerPrice;
      if (order.orderType === "Take-profit") return asset.price >= order.triggerPrice;
      return false;
    });
    triggered.slice(0, 1).forEach((order) => {
      const asset = market.find((item) => item.symbol === order.symbol);
      if (asset && trade(order.symbol, order.side, order.qty, "Market")) {
        setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, status: "Completed", price: asset.price, total: asset.price * item.qty } : item)));
        notify(`${order.orderType} order triggered for ${asset.base}.`);
      }
    });
  }, [assets, orders]);

  function addAlert(symbol: string, target: number, direction: PriceAlert["direction"]) {
    if (!target) return;
    setAlerts((current) => [{ id: uid(), symbol, target, direction, active: true }, ...current]);
    notify(`Alert activated for ${symbol}.`);
  }

  function runStrategy(strategy: string, symbol: string) {
    const asset = [...assets, ...STOCKS.map((stock) => ({ ...stock, kind: "stock" as const }))].find((item) => item.symbol === symbol);
    const holding = holdings.find((item) => item.symbol === symbol);
    if (!asset) return;
    if (strategy === "Buy the dip") trade(symbol, "BUY", Math.max(0.001, 600 / asset.price), "Limit", asset.price * 0.98);
    if (strategy === "DCA") trade(symbol, "BUY", Math.max(0.001, 500 / asset.price), "Market");
    if (strategy === "Momentum") asset.change > 0 ? trade(symbol, "BUY", Math.max(0.001, 700 / asset.price), "Market") : notify("Momentum is weak, strategy stayed out.");
    if (strategy === "Stop guard") holding ? trade(symbol, "SELL", holding.qty * 0.5, "Stop-loss", asset.price * 0.95) : notify("No holding available for stop-loss.");
  }

  return {
    preferences,
    setPreferences,
    assets: activeAssets,
    allAssets: [...assets, ...STOCKS.map((stock) => ({ ...stock, kind: "stock" as const }))],
    mode,
    setMode,
    holdings,
    orders,
    alerts,
    setAlerts,
    addAlert,
    watchlist,
    setWatchlist,
    cash,
    portfolio,
    riskScore,
    trade,
    runStrategy,
    toast,
    notify,
    apiMode,
  };
}

function CommandPalette() {
  const app = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!open) return null;

  const commands = [
    { name: "Switch to Dark Theme", action: () => app.setPreferences({ ...app.preferences, theme: "dark" }) },
    { name: "Switch to Light Theme", action: () => app.setPreferences({ ...app.preferences, theme: "light" }) },
    { name: "Go to Settings", action: () => navigate("/settings") },
    { name: "Go to Portfolio", action: () => navigate("/portfolio") },
    { name: "Buy 10 BTC", action: () => app.trade("BTCUSDT", "BUY", 10) },
    { name: "Search Ethereum", action: () => navigate("/asset/ETHUSDT") },
  ].filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="spotlight-overlay" onClick={() => setOpen(false)}>
      <div className="spotlight" onClick={(e) => e.stopPropagation()}>
        <input autoFocus placeholder="Type a command or search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="spotlight-results">
          {commands.map((cmd) => (
            <div key={cmd.name} className="spotlight-item" onClick={() => { cmd.action(); setOpen(false); }}>
              <Search size={16} /> <span>{cmd.name}</span>
            </div>
          ))}
          {commands.length === 0 && <div className="empty">No commands found.</div>}
        </div>
      </div>
    </div>
  );
}

function CandlestickWidget({ asset }: { asset: Asset }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const app = useApp();
  const [chartType, setChartType] = useState<"Candlestick" | "Line" | "Area">("Candlestick");

  useEffect(() => {
    if (!chartContainerRef.current || !asset) return;
    const isLight = app.preferences.theme === "light";
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: "transparent" }, textColor: isLight ? "#61716e" : "#93aaa3" },
      grid: { vertLines: { color: isLight ? "rgba(25, 45, 41, 0.08)" : "rgba(201, 255, 236, 0.08)" }, horzLines: { color: isLight ? "rgba(25, 45, 41, 0.08)" : "rgba(201, 255, 236, 0.08)" } },
      timeScale: { borderColor: "rgba(159, 245, 213, 0.14)" },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;
    
    const data: any[] = [];
    let price = asset.price * 0.9;
    const now = Math.floor(Date.now() / 1000) - 86400 * 60;
    for (let i = 0; i < 60; i++) {
      const open = price;
      const close = price * (1 + (Math.random() - 0.48) * 0.05);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      data.push({ time: (now + i * 86400) as any, open, high, low, close, value: close });
      price = close;
    }

    let series: any;
    if (chartType === "Candlestick") {
      series = chart.addSeries(CandlestickSeries, { upColor: "#3ee88f", downColor: "#ff6b81", borderVisible: false, wickUpColor: "#3ee88f", wickDownColor: "#ff6b81" });
      series.setData(data.map((d) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close })));
    } else if (chartType === "Line") {
      series = chart.addSeries(LineSeries, { color: "#3ee88f", lineWidth: 2 });
      series.setData(data.map((d) => ({ time: d.time, value: d.close })));
    } else {
      series = chart.addSeries(AreaSeries, { lineColor: "#3ee88f", topColor: "rgba(62, 232, 143, 0.35)", bottomColor: "rgba(62, 232, 143, 0.0)" });
      series.setData(data.map((d) => ({ time: d.time, value: d.close })));
    }

    let ticksInCurrentCandle = 0;
    const interval = setInterval(() => {
      const last = data[data.length - 1];
      
      const target = asset.price;
      const diff = target - last.close;
      const tickClose = last.close + (diff * 0.4) + (target * (Math.random() - 0.5) * 0.001);
      
      const high = Math.max(last.high, tickClose);
      const low = Math.min(last.low, tickClose);
      
      last.close = tickClose;
      last.high = high;
      last.low = low;
      last.value = tickClose;
      
      if (chartType === "Candlestick") {
        series.update({ time: last.time, open: last.open, high: last.high, low: last.low, close: last.close });
      } else {
        series.update({ time: last.time, value: last.value });
      }

      ticksInCurrentCandle++;
      // Create a new data point every 5 seconds so it doesn't scroll excessively fast
      if (ticksInCurrentCandle > 5) {
         ticksInCurrentCandle = 0;
         data.push({
            time: last.time + 86400,
            open: tickClose,
            high: tickClose,
            low: tickClose,
            close: tickClose,
            value: tickClose
         });
      }
    }, 1000);
    // Prevent browser page-zoom when scrolling over the chart
    const container = chartContainerRef.current;
    const blockZoom = (e: WheelEvent) => { e.preventDefault(); e.stopPropagation(); };
    container.addEventListener("wheel", blockZoom, { passive: false });

    return () => {
      clearInterval(interval);
      container.removeEventListener("wheel", blockZoom);
      chart.remove();
      chartRef.current = null;
    };
  }, [asset?.symbol, app.preferences.theme, chartType]);

  function enableInteraction() {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({ handleScroll: true, handleScale: true });
  }

  function disableInteraction() {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
  }

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      onMouseEnter={enableInteraction}
      onMouseLeave={disableInteraction}
    >
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
        <select
          value={chartType}
          onChange={(e) => setChartType(e.target.value as any)}
          style={{
            background: "var(--panel-strong)",
            border: "1px solid var(--line)",
            color: "var(--text)",
            padding: "6px 12px",
            borderRadius: "6px",
            outline: "none",
            cursor: "pointer",
            fontSize: "0.85rem"
          }}
        >
          <option value="Candlestick">Candlesticks</option>
          <option value="Line">Line Chart</option>
          <option value="Area">Area Chart</option>
        </select>
      </div>
      <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

function OrderBookContent({ symbol }: { symbol: string }) {
  const app = useApp();
  const asset = app.assets.find((a) => a.symbol === symbol) || app.assets[0];
  const [bids, setBids] = useState<any[]>([]);
  const [asks, setAsks] = useState<any[]>([]);

  useEffect(() => {
    if (!asset) return;
    const generate = (isBid: boolean) => {
      let total = 0;
      return Array.from({ length: 7 }, (_, i) => {
        const price = asset.price * (1 + (isBid ? -1 : 1) * (0.0005 * (i + 1) + Math.random() * 0.001));
        const size = Math.random() * 5 + 0.1;
        total += size;
        return { price, size, total };
      });
    };
    const interval = setInterval(() => {
      setBids(generate(true));
      setAsks(generate(false).reverse());
    }, 3500);
    return () => clearInterval(interval);
  }, [asset?.price]);

  const maxTotal = Math.max(...[...bids, ...asks].map((x) => x.total), 1);
  return (
    <>
      <PanelTitle title="Order Book" action={<Activity size={16} />} />
      <div className="order-book">
        <div className="ob-row"><span className="total">Price</span><span className="size">Size</span><span className="total">Total</span></div>
        {asks.map((ask, i) => (
          <div className="ob-row ask" key={"ask" + i}>
            <div className="ob-depth" style={{ width: `${(ask.total / maxTotal) * 100}%` }} />
            <span className="price">{ask.price.toFixed(2)}</span><span className="size">{ask.size.toFixed(4)}</span><span className="total">{ask.total.toFixed(2)}</span>
          </div>
        ))}
        <div style={{ textAlign: "center", margin: "6px 0", fontSize: "1.2rem", fontWeight: "bold" }}>{asset?.price.toFixed(2)}</div>
        {bids.map((bid, i) => (
          <div className="ob-row bid" key={"bid" + i}>
            <div className="ob-depth" style={{ width: `${(bid.total / maxTotal) * 100}%` }} />
            <span className="price">{bid.price.toFixed(2)}</span><span className="size">{bid.size.toFixed(4)}</span><span className="total">{bid.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

type TradeXState = ReturnType<typeof useTradeX>;
const TradeXContext = React.createContext<TradeXState | null>(null);
function useApp() {
  const value = React.useContext(TradeXContext);
  if (!value) throw new Error("TradeX context missing");
  return value;
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const app = useApp();
  const location = useLocation();
  const loggedUser = localStorage.getItem("tradex-user") || "User";
  return (
    <div className="app-shell">
      <CommandPalette />
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">TX</span>
          <span>TradeX</span>
        </Link>
        <nav>
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <NavItem to="/asset/BTCUSDT" icon={<CandlestickChart size={18} />} label="Asset" />
          <NavItem to="/portfolio" icon={<Briefcase size={18} />} label="Portfolio" />
          <NavItem to="/orders" icon={<History size={18} />} label="Orders" />
          <NavItem to="/settings" icon={<Settings size={18} />} label="Settings" />
        </nav>
        <div className="status-card">
          <ShieldCheck size={18} />
          <div>
            <strong>{app.apiMode === "live" ? "Binance Live" : "Simulated"}</strong>
            <span>No backend, local trades</span>
          </div>
        </div>
        <div className="user-card">
          <div className="user-avatar"><User size={15} /></div>
          <div className="user-info">
            <strong>{loggedUser}</strong>
            <span>Demo Account</span>
          </div>
          <button className="logout-btn" title="Logout" onClick={onLogout}><X size={14} /></button>
        </div>
      </aside>
      <main>
        <Topbar onLogout={onLogout} />
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: app.preferences.animations ? 16 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: app.preferences.animations ? -12 : 0 }}
            transition={{ duration: 0.28 }}
          >
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/asset/:symbol" element={<AssetDetail />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <AnimatePresence>{app.toast && <Toast message={app.toast} />}</AnimatePresence>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function Topbar({ onLogout }: { onLogout: () => void }) {
  const app = useApp();
  const loggedUser = localStorage.getItem("tradex-user") || "User";
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">ACES Webathon 2026</p>
        <h1>Advanced Trading Dashboard</h1>
      </div>
      <div className="topbar-actions">
        <div className="segmented">
          <button className={app.mode === "crypto" ? "selected" : ""} onClick={() => app.setMode("crypto")}>Crypto</button>
          <button className={app.mode === "stock" ? "selected" : ""} onClick={() => app.setMode("stock")}>Stocks</button>
        </div>
        <button
          className="icon-btn"
          aria-label="Toggle theme"
          onClick={() => app.setPreferences((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }))}
        >
          {app.preferences.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="topbar-user">
          <User size={14} />
          <span>{loggedUser}</span>
          <button className="ghost-btn" style={{ padding: "0 10px", minHeight: 34, fontSize: "0.8rem" }} onClick={onLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}

function StatCard({ title, value, tone, icon }: { title: string; value: string; tone?: "up" | "down"; icon: React.ReactNode }) {
  return (
    <motion.section className="stat-card" whileHover={{ y: -4 }}>
      <div className="stat-icon">{icon}</div>
      <span>{title}</span>
      <strong className={tone === "up" ? "gain" : tone === "down" ? "loss" : ""}>{value}</strong>
    </motion.section>
  );
}

const DraggablePanel = ({ id, children, onPanelDrop, className = "panel" }: { id: string; children: React.ReactNode; onPanelDrop: (target: string, source: string) => void; className?: string }) => (
  <section
    className={className}
    draggable
    onDragStart={(e) => {
      e.dataTransfer.setData("panel", id);
      e.stopPropagation();
    }}
    onDragOver={(e) => e.preventDefault()}
    onDrop={(e) => {
      const source = e.dataTransfer.getData("panel");
      if (source && source !== id) {
        e.preventDefault();
        e.stopPropagation();
        onPanelDrop(id, source);
      }
    }}
  >
    {children}
  </section>
);

function Dashboard() {
  const app = useApp();
  const navigate = useNavigate();
  const top = [...app.assets].sort((a, b) => b.change - a.change).slice(0, 4);
  const bottom = [...app.assets].sort((a, b) => a.change - b.change).slice(0, 4);
  let watchAssets = app.watchlist
    .map((symbol) => app.allAssets.find((asset) => asset.symbol === symbol))
    .filter(Boolean)
    .filter((asset) => asset?.kind === app.mode) as Asset[];
  
  if (watchAssets.length === 0) {
    watchAssets = app.assets.slice(0, 4);
  }

  const defaultLayout = ["chart", "ob", "top", "bottom", "watchlist", "news", "heatmap", "assistant", "alerts", "impact"];
  const [layout, setLayout] = useState(() => storage.get("dashboard-layout", defaultLayout));

  useEffect(() => storage.set("dashboard-layout", layout), [layout]);

  useEffect(() => {
    if (!localStorage.getItem("tour-done")) {
      const driverObj = driver({
        showProgress: true,
        steps: [
          { popover: { title: "Welcome to TradeX", description: "Experience the premium mock trading terminal." } },
          { element: ".tour-chart", popover: { title: "Pro Candlesticks", description: "Real-time simulated OHLC data rendering.", side: "left", align: "start" } },
          { element: ".tour-ob", popover: { title: "Live Order Book", description: "High-speed market depth simulation generating realistic liquidity.", side: "left", align: "start" } },
          { element: ".tour-leaderboard", popover: { title: "Social Copy Trading", description: "Click any trader to instantly copy their fake portfolio allocation!", side: "top", align: "start" } },
          { element: ".tour-watchlist", popover: { title: "Drag & Drop UI", description: "Reorder panels and watchlist items by dragging them to customize your view.", side: "top", align: "start" } },
          { popover: { title: "Command Palette", description: "Press Ctrl+K (or Cmd+K) anytime to open the spotlight search.", side: "bottom", align: "start" } }
        ]
      });
      setTimeout(() => driverObj.drive(), 500);
      localStorage.setItem("tour-done", "true");
    }
  }, []);

  function onWatchlistDrop(target: string, source: string) {
    const current = [...app.watchlist];
    const from = current.indexOf(source);
    const to = current.indexOf(target);
    if (from < 0 || to < 0) return;
    current.splice(to, 0, current.splice(from, 1)[0]);
    app.setWatchlist(current);
  }

  function onPanelDrop(target: string, source: string) {
    const current = [...layout];
    const from = current.indexOf(source);
    const to = current.indexOf(target);
    if (from < 0 || to < 0) return;
    current.splice(to, 0, current.splice(from, 1)[0]);
    setLayout(current);
  }

  const panels: Record<string, React.ReactNode> = {
    chart: <DraggablePanel id="chart" key="chart" onPanelDrop={onPanelDrop} className="panel wide tour-chart"><PanelTitle title="Market Pulse" /><div className="chart-tall"><CandlestickWidget asset={app.assets[0]} /></div></DraggablePanel>,
    ob: <DraggablePanel id="ob" key="ob" onPanelDrop={onPanelDrop} className="panel tour-ob"><OrderBookContent symbol={app.assets[0]?.symbol} /></DraggablePanel>,
    top: <DraggablePanel id="top" key="top" onPanelDrop={onPanelDrop}><PanelTitle title="Top Gainers" action={<ArrowUpRight size={16} />} /><AssetList assets={top} /></DraggablePanel>,
    bottom: <DraggablePanel id="bottom" key="bottom" onPanelDrop={onPanelDrop}><PanelTitle title="Top Losers" action={<ArrowDownRight size={16} />} /><AssetList assets={bottom} /></DraggablePanel>,
    watchlist: <DraggablePanel id="watchlist" key="watchlist" onPanelDrop={onPanelDrop} className="panel tour-watchlist"><PanelTitle title="Watchlist" action="drag items" /><div className="watchlist">{watchAssets.map((asset) => (<div className="watch-row" key={asset.symbol} draggable onDragStart={(event) => { event.dataTransfer.setData("watchlist", asset.symbol); event.stopPropagation(); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); onWatchlistDrop(asset.symbol, event.dataTransfer.getData("watchlist")); }} onClick={() => navigate(`/asset/${asset.symbol}`)}><GripVertical size={15} /><strong>{asset.base}</strong><span>{formatMoney(asset.price, app.preferences.currency)}</span><Change value={asset.change} /></div>))}</div></DraggablePanel>,
    news: <DraggablePanel id="news" key="news" onPanelDrop={onPanelDrop}><PanelTitle title="Live News" action={<Bell size={16} />} /><div className="news-stack">{["ETF flows lift blue-chip crypto bid", "Altcoin volatility expands before US session", "AI chip stocks lead simulated equity basket", "Stablecoin liquidity rises across venues"].map((item, index) => (<motion.div className="news-item" key={item} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }}><Clock3 size={14} /><span>{item}</span></motion.div>))}</div></DraggablePanel>,
    heatmap: <DraggablePanel id="heatmap" key="heatmap" onPanelDrop={onPanelDrop} className="panel wide"><MarketHeatmapContent /></DraggablePanel>,
    assistant: <DraggablePanel id="assistant" key="assistant" onPanelDrop={onPanelDrop}><AssistantContent /></DraggablePanel>,
    alerts: <DraggablePanel id="alerts" key="alerts" onPanelDrop={onPanelDrop}><AlertsContent /></DraggablePanel>,
    impact: <DraggablePanel id="impact" key="impact" onPanelDrop={onPanelDrop}><NewsImpactContent /></DraggablePanel>
  };

  return (
    <div className="page-grid">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="live-pill"><Activity size={14} /> {app.apiMode === "live" ? "Live Binance public data" : "Fallback simulator"}</span>
          <h2>Trade, test, and track a market that feels alive.</h2>
          <p>Public market streams power the prices while every order, watchlist move, and setting stays safely in the browser.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => navigate("/asset/BTCUSDT")}>Open BTC Desk</button>
            <button className="ghost-btn" onClick={() => navigate("/portfolio")}>View Portfolio</button>
          </div>
        </div>
        <div className="scene-wrap">
          <MarketScene />
        </div>
      </section>
      <div className="stats-grid">
        <StatCard title="Portfolio Value" value={formatMoney(app.portfolio.value, app.preferences.currency)} icon={<Wallet />} />
        <StatCard title="Profit / Loss" value={formatMoney(app.portfolio.pnl, app.preferences.currency)} tone={app.portfolio.pnl >= 0 ? "up" : "down"} icon={<TrendingUp />} />
        <StatCard title="Fake Balance" value={formatMoney(app.cash, app.preferences.currency)} icon={<CircleDollarSign />} />
        <StatCard title="Watchlist" value={`${app.watchlist.length} assets`} icon={<Bell />} />
      </div>
      {layout.map(id => panels[id])}
    </div>
  );
}

function PanelTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="panel-title">
      <h3>{title}</h3>
      {action && <span>{action}</span>}
    </div>
  );
}

function AssetList({ assets }: { assets: Asset[] }) {
  const app = useApp();
  return (
    <div className="asset-list">
      {assets.map((asset) => (
        <Link to={`/asset/${asset.symbol}`} className="asset-row" key={asset.symbol}>
          <div>
            <strong>{asset.base}</strong>
            <span>{asset.name}</span>
          </div>
          <span>{formatMoney(asset.price, app.preferences.currency)}</span>
          <Change value={asset.change} />
        </Link>
      ))}
    </div>
  );
}

function MarketHeatmapContent() {
  const app = useApp();
  return (
    <>
      <PanelTitle title="Market Heatmap" action={<Flame size={16} />} />
      <div className="heatmap">
        {app.assets.map((asset) => (
          <Link
            to={`/asset/${asset.symbol}`}
            key={asset.symbol}
            className={asset.change >= 0 ? "heat-tile heat-up" : "heat-tile heat-down"}
            style={{ minHeight: `${76 + Math.min(54, Math.abs(asset.change) * 10)}px` }}
          >
            <strong>{asset.base}</strong>
            <span>{formatMoney(asset.price, app.preferences.currency)}</span>
            <b>{asset.change >= 0 ? "+" : ""}{asset.change.toFixed(2)}%</b>
          </Link>
        ))}
      </div>
    </>
  );
}

function AssistantContent() {
  const app = useApp();
  const leader = [...app.assets].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  const insight = app.portfolio.pnl >= 0
    ? "Your paper portfolio is in profit. Consider protecting gains with take-profit orders on concentrated positions."
    : "Your paper portfolio is under pressure. The risk meter can help spot whether losses are from concentration or broad volatility.";
  return (
    <>
      <PanelTitle title="AI Market Assistant" action={<Bot size={16} />} />
      <div className="assistant-card">
        <Sparkles size={18} />
        <p>{insight}</p>
      </div>
      <div className="assistant-card">
        <Radio size={18} />
        <p>{leader?.base} is the most active signal right now at {leader?.change.toFixed(2)}%.</p>
      </div>
    </>
  );
}

function AlertsContent() {
  const app = useApp();
  const [symbol, setSymbol] = useState(app.assets[0]?.symbol ?? "BTCUSDT");
  const [target, setTarget] = useState(app.assets[0]?.price ?? 0);
  const [direction, setDirection] = useState<PriceAlert["direction"]>("above");
  return (
    <>
      <PanelTitle title="Price Alerts" action={<Target size={16} />} />
      <select value={symbol} onChange={(event) => setSymbol(event.target.value)}>
        {app.allAssets.map((asset) => <option key={asset.symbol}>{asset.symbol}</option>)}
      </select>
      <div className="segmented fill">
        <button className={direction === "above" ? "selected" : ""} onClick={() => setDirection("above")}>Above</button>
        <button className={direction === "below" ? "selected" : ""} onClick={() => setDirection("below")}>Below</button>
      </div>
      <input type="number" value={target} onChange={(event) => setTarget(Number(event.target.value))} />
      <button className="primary-btn full" onClick={() => app.addAlert(symbol, target, direction)}>Set Price Alert</button>
      <div className="mini-stack">
        {app.alerts.slice(0, 3).map((alert) => (
          <span key={alert.id} className={alert.active ? "mini-chip" : "mini-chip muted-chip"}>
            {alert.symbol} {alert.direction} {formatMoney(alert.target, app.preferences.currency)}
          </span>
        ))}
      </div>
    </>
  );
}

function NewsImpactContent() {
  const app = useApp();
  const rows = [
    { title: "Liquidity wave", asset: app.assets[0], impact: "High volume may expand intraday range." },
    { title: "Risk rotation", asset: app.assets[1], impact: "Momentum traders are watching relative strength." },
    { title: "Macro pulse", asset: app.assets[2], impact: "Fake headline pressure favors defensive sizing." },
  ];
  return (
    <>
      <PanelTitle title="News Impact" action={<Activity size={16} />} />
      <div className="news-stack">
        {rows.map((row) => (
          <div className="impact-row" key={row.title}>
            <strong>{row.title}</strong>
            <span>{row.asset?.base}: {row.impact}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Change({ value }: { value: number }) {
  return <span className={value >= 0 ? "change gain" : "change loss"}>{value >= 0 ? "+" : ""}{value.toFixed(2)}%</span>;
}

function AssetDetail() {
  const { symbol = "BTCUSDT" } = useParams();
  const app = useApp();
  const asset = app.allAssets.find((item) => item.symbol === symbol) ?? app.assets[0];
  const [range, setRange] = useState("1D");
  const [modal, setModal] = useState<"BUY" | "SELL" | null>(null);
  const [qty, setQty] = useState(1);
  const chart = useMemo(() => buildChart(asset.price, range), [asset.price, range]);
  const isWatched = app.watchlist.includes(asset.symbol);

  return (
    <div className="asset-layout">
      <section className="panel asset-head">
        <div>
          <p className="eyebrow">{asset.kind.toUpperCase()} MARKET</p>
          <h2>{asset.name}</h2>
          <div className="price-line">
            <strong>{formatMoney(asset.price, app.preferences.currency)}</strong>
            <Change value={asset.change} />
          </div>
        </div>
        <div className="asset-actions">
          <button
            className="ghost-btn"
            onClick={() => {
              app.setWatchlist(isWatched ? app.watchlist.filter((item) => item !== asset.symbol) : [...app.watchlist, asset.symbol]);
              app.notify(isWatched ? "Removed from watchlist" : "Added to watchlist");
            }}
          >
            <Bell size={16} /> {isWatched ? "Watching" : "Watch"}
          </button>
          <button className="buy-btn" onClick={() => setModal("BUY")}>Buy</button>
          <button className="sell-btn" onClick={() => setModal("SELL")}>Sell</button>
        </div>
      </section>
      <section className="panel wide chart-panel">
        <PanelTitle
          title="Price Chart"
          action={
            <div className="range-tabs">
              {["1D", "1W", "1M"].map((item) => (
                <button key={item} className={range === item ? "selected" : ""} onClick={() => setRange(item)}>{item}</button>
              ))}
            </div>
          }
        />
        <div className="chart-main">
          <ResponsiveContainer width="100%" height="100%">
            {app.preferences.chartStyle === "Area" ? (
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="assetGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#4aa3ff" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#4aa3ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis dataKey="time" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" domain={["dataMin", "dataMax"]} />
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="price" stroke="#4aa3ff" fill="url(#assetGradient)" strokeWidth={3} />
              </AreaChart>
            ) : (
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis dataKey="time" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" />
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8 }} />
                <Bar dataKey="price" fill="#4aa3ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel">
        <PanelTitle title="Asset Info" action={<SlidersHorizontal size={16} />} />
        <Info label="24h High" value={formatMoney(asset.high, app.preferences.currency)} />
        <Info label="24h Low" value={formatMoney(asset.low, app.preferences.currency)} />
        <Info label="Volume" value={formatNumber(asset.volume)} />
        <Info label="Sentiment" value={asset.change >= 0 ? "Bullish" : "Risk-off"} />
      </section>
      <section className="panel">
        <PanelTitle title="Quick Trade" action={<ChevronDown size={16} />} />
        <label className="input-label">Quantity</label>
        <input value={qty} min={0} type="number" onChange={(event) => setQty(Number(event.target.value))} />
        <div className="trade-total">
          <span>Estimated total</span>
          <strong>{formatMoney(qty * asset.price, app.preferences.currency)}</strong>
        </div>
        <div className="two-buttons">
          <button className="buy-btn" onClick={() => setModal("BUY")}>Buy</button>
          <button className="sell-btn" onClick={() => setModal("SELL")}>Sell</button>
        </div>
      </section>
      <AnimatePresence>
        {modal && (
          <TradeModal
            side={modal}
            asset={asset}
            qty={qty}
            setQty={setQty}
            onClose={() => setModal(null)}
            onConfirm={() => {
              if (app.trade(asset.symbol, modal, qty)) setModal(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TradeModal({ side, asset, qty, setQty, onClose, onConfirm }: { side: "BUY" | "SELL"; asset: Asset; qty: number; setQty: (qty: number) => void; onClose: () => void; onConfirm: () => void }) {
  const app = useApp();
  const [orderType, setOrderType] = useState<Order["orderType"]>("Market");
  const [triggerPrice, setTriggerPrice] = useState(asset.price);
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal" initial={{ scale: 0.94, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 24 }}>
        <button className="close" onClick={onClose}><X size={18} /></button>
        <h3>{side} {asset.base}</h3>
        <p>Simulated order at current market price. Stored locally in this browser.</p>
        <label className="input-label">Order type</label>
        <select value={orderType} onChange={(event) => setOrderType(event.target.value as Order["orderType"])}>
          <option>Market</option>
          <option>Limit</option>
          <option>Stop-loss</option>
          <option>Take-profit</option>
        </select>
        {orderType !== "Market" && (
          <>
            <label className="input-label">Trigger price</label>
            <input type="number" min={0} value={triggerPrice} onChange={(event) => setTriggerPrice(Number(event.target.value))} />
          </>
        )}
        <label className="input-label">Quantity</label>
        <input type="number" min={0} value={qty} onChange={(event) => setQty(Number(event.target.value))} />
        <Info label="Price" value={formatMoney(asset.price, app.preferences.currency)} />
        <Info label="Total" value={formatMoney(qty * (orderType === "Market" ? asset.price : triggerPrice), app.preferences.currency)} />
        <button className={side === "BUY" ? "buy-btn full" : "sell-btn full"} onClick={() => {
          if (app.trade(asset.symbol, side, qty, orderType, triggerPrice)) onClose();
        }}>
          Confirm {side}
        </button>
      </motion.div>
    </motion.div>
  );
}

function Portfolio() {
  const app = useApp();
  const rows = app.holdings.map((holding) => {
    const asset = app.allAssets.find((item) => item.symbol === holding.symbol);
    const price = asset?.price ?? holding.avgPrice;
    const value = price * holding.qty;
    const pnl = value - holding.avgPrice * holding.qty;
    return { ...holding, asset, price, value, pnl };
  });
  const allocation = rows.map((row) => ({ name: row.asset?.base ?? row.symbol, value: row.value }));
  return (
    <div className="portfolio-layout">
      <div className="stats-grid">
        <StatCard title="Holdings Value" value={formatMoney(app.portfolio.value, app.preferences.currency)} icon={<Briefcase />} />
        <StatCard title="Unrealized P/L" value={formatMoney(app.portfolio.pnl, app.preferences.currency)} tone={app.portfolio.pnl >= 0 ? "up" : "down"} icon={<TrendingUp />} />
        <StatCard title="Available Cash" value={formatMoney(app.cash, app.preferences.currency)} icon={<Wallet />} />
      </div>
      <section className="panel wide">
        <PanelTitle title="Holdings" action={`${rows.length} assets`} />
        <div className="table">
          <div className="table-head"><span>Asset</span><span>Qty</span><span>Avg</span><span>Current</span><span>P/L</span></div>
          {rows.length === 0 && <div className="empty">No holdings yet. Try a simulated buy order.</div>}
          {rows.map((row) => (
            <div className="table-row" key={row.symbol}>
              <strong>{row.asset?.base ?? row.symbol}</strong>
              <span>{row.qty.toFixed(4)}</span>
              <span>{formatMoney(row.avgPrice, app.preferences.currency)}</span>
              <span>{formatMoney(row.price, app.preferences.currency)}</span>
              <span className={row.pnl >= 0 ? "gain" : "loss"}>{formatMoney(row.pnl, app.preferences.currency)}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <PanelTitle title="Allocation" action={<Wallet size={16} />} />
        <div className="pie-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={4}>
                {allocation.map((_, index) => <Cell key={index} fill={["#3ee88f", "#4aa3ff", "#f8c24a", "#ff6b81", "#a78bfa"][index % 5]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--panel-strong)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--text)" }} itemStyle={{ color: "var(--text)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
      <RiskMeter />
      <StrategySimulator />
      <Leaderboard />
    </div>
  );
}

function RiskMeter() {
  const app = useApp();
  const label = app.riskScore > 70 ? "Aggressive" : app.riskScore > 38 ? "Balanced" : "Conservative";
  return (
    <section className="panel">
      <PanelTitle title="Risk Meter" action={<Gauge size={16} />} />
      <div className="risk-ring" style={{ background: `conic-gradient(var(--loss) ${app.riskScore * 3.6}deg, rgba(137,160,155,.16) 0)` }}>
        <div>
          <strong>{app.riskScore}</strong>
          <span>{label}</span>
        </div>
      </div>
      <p className="muted-text">Score blends volatility, concentration, and drawdown from your local paper portfolio.</p>
    </section>
  );
}

function StrategySimulator() {
  const app = useApp();
  const [symbol, setSymbol] = useState(app.assets[0]?.symbol ?? "BTCUSDT");
  return (
    <section className="panel">
      <PanelTitle title="Strategy Simulator" action={<Play size={16} />} />
      <select value={symbol} onChange={(event) => setSymbol(event.target.value)}>
        {app.allAssets.map((asset) => <option key={asset.symbol}>{asset.symbol}</option>)}
      </select>
      <div className="strategy-grid">
        {["Buy the dip", "DCA", "Momentum", "Stop guard"].map((strategy) => (
          <button key={strategy} className="strategy-btn" onClick={() => app.runStrategy(strategy, symbol)}>{strategy}</button>
        ))}
      </div>
    </section>
  );
}

function Leaderboard() {
  const app = useApp();
  const rows = [
    { name: "You", value: app.cash + app.portfolio.value, change: app.portfolio.pnl },
    { name: "Aarav", value: 112400, change: 8400 },
    { name: "Mira", value: 108900, change: 6100 },
    { name: "Dev", value: 97300, change: -2700 },
  ].sort((a, b) => b.value - a.value);

  const copyTrade = (name: string) => {
    app.notify(`Copying ${name}'s strategy... Bought top 3 assets.`);
    app.trade("BTCUSDT", "BUY", 0.5);
    app.trade("SOLUSDT", "BUY", 50);
    app.trade("BNBUSDT", "BUY", 10);
  };

  return (
    <section className="panel tour-leaderboard">
      <PanelTitle title="Trading Challenge" action={<Trophy size={16} />} />
      <div className="leaderboard">
        {rows.map((row, index) => (
          <div
            className="leader-row"
            key={row.name}
            style={{ cursor: row.name !== "You" ? "pointer" : "default" }}
            onClick={() => row.name !== "You" && copyTrade(row.name)}
          >
            <b>#{index + 1}</b>
            <span>{row.name}</span>
            <strong>{formatMoney(row.value, app.preferences.currency)}</strong>
            <Change value={(row.change / 100000) * 100} />
            {row.name !== "You" && (
              <button className="ghost-btn" style={{ padding: "4px 8px", fontSize: "0.75rem", minHeight: "auto" }}>
                Copy
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Orders() {
  const app = useApp();
  const [side, setSide] = useState("ALL");
  const [query, setQuery] = useState("");
  const filtered = app.orders.filter((order) => (side === "ALL" || order.side === side) && order.symbol.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="orders-layout">
      <section className="panel wide">
        <PanelTitle title="Order History" action={<History size={16} />} />
        <div className="filters">
          <div className="searchbox"><Search size={16} /><input placeholder="Search asset" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="segmented">
            {["ALL", "BUY", "SELL"].map((item) => <button key={item} className={side === item ? "selected" : ""} onClick={() => setSide(item)}>{item}</button>)}
          </div>
        </div>
        <div className="table">
          <div className="table-head orders"><span>Date</span><span>Asset</span><span>Side</span><span>Type</span><span>Total</span><span>Status</span></div>
          {filtered.length === 0 && <div className="empty">No matching orders.</div>}
          {filtered.map((order) => (
            <div className="table-row orders" key={order.id}>
              <span>{new Date(order.date).toLocaleString()}</span>
              <strong>{order.symbol}</strong>
              <span className={order.side === "BUY" ? "gain" : "loss"}>{order.side}</span>
              <span>{order.orderType ?? "Market"}</span>
              <span>{formatMoney(order.total, app.preferences.currency)}</span>
              <span className={order.status === "Pending" ? "status pending" : "status"}><CheckCircle2 size={14} /> {order.status}</span>
            </div>
          ))}
        </div>
      </section>
      <TradeReplayTimeline />
    </div>
  );
}

function TradeReplayTimeline() {
  const app = useApp();
  const replay = [...app.orders].reverse().slice(-8).reduce(
    (rows, order, index) => {
      const previous = rows[index - 1]?.value ?? 100000;
      const delta = order.side === "BUY" ? order.total * 0.01 : order.total * 0.006;
      return [...rows, { name: `T${index + 1}`, value: Math.round(previous + (order.side === "BUY" ? delta : -delta)), order }];
    },
    [] as { name: string; value: number; order: Order }[]
  );
  return (
    <section className="panel">
      <PanelTitle title="Trade Replay" action={<Play size={16} />} />
      <div className="replay-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={replay}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="name" stroke="var(--muted)" />
            <YAxis stroke="var(--muted)" />
            <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8 }} />
            <Area dataKey="value" stroke="#f8c24a" fill="#f8c24a33" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mini-stack">
        {replay.slice(-3).map((row) => <span className="mini-chip" key={row.order.id}>{row.order.side} {row.order.symbol}</span>)}
      </div>
    </section>
  );
}

function SettingsPage() {
  const app = useApp();
  return (
    <div className="settings-layout">
      <section className="panel profile-panel">
        <div className="avatar"><User size={32} /></div>
        <h2>Nikhil Trader</h2>
        <p>Frontend-only paper trading profile</p>
      </section>
      <section className="panel wide">
        <PanelTitle title="Preferences" action={<Settings size={16} />} />
        <Setting label="Theme">
          <div className="segmented">
            {["dark", "light"].map((theme) => (
              <button key={theme} className={app.preferences.theme === theme ? "selected" : ""} onClick={() => app.setPreferences((current) => ({ ...current, theme: theme as Preferences["theme"] }))}>{theme}</button>
            ))}
          </div>
        </Setting>
        <Setting label="Currency">
          <div className="segmented">
            {["USD", "INR"].map((currency) => (
              <button key={currency} className={app.preferences.currency === currency ? "selected" : ""} onClick={() => app.setPreferences((current) => ({ ...current, currency: currency as Preferences["currency"] }))}>{currency}</button>
            ))}
          </div>
        </Setting>
        <Setting label="Chart Style">
          <div className="segmented">
            {["Area", "Bars"].map((chartStyle) => (
              <button key={chartStyle} className={app.preferences.chartStyle === chartStyle ? "selected" : ""} onClick={() => app.setPreferences((current) => ({ ...current, chartStyle: chartStyle as Preferences["chartStyle"] }))}>{chartStyle}</button>
            ))}
          </div>
        </Setting>
        <Setting label="Animations">
          <Toggle checked={app.preferences.animations} onChange={(checked) => app.setPreferences((current) => ({ ...current, animations: checked }))} />
        </Setting>
        <Setting label="Price Alerts">
          <Toggle checked={app.preferences.alerts} onChange={(checked) => app.setPreferences((current) => ({ ...current, alerts: checked }))} />
        </Setting>
      </section>
    </div>
  );
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <button className={`toggle ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}><span /></button>;
}

function Toast({ message }: { message: string }) {
  return (
    <motion.div className="toast" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}>
      <CheckCircle2 size={17} />
      {message}
    </motion.div>
  );
}

// ─── Auth ────────────────────────────────────────────────────────────────────
const VALID_USER = "nikhil6273";
const VALID_PASS = "Nikhil@1";

function validatePassword(pw: string): string[] {
  const errors: string[] = [];
  if (!/[a-z]/.test(pw)) errors.push("One lowercase letter");
  if (!/[A-Z]/.test(pw)) errors.push("One uppercase letter");
  if (!/[0-9]/.test(pw)) errors.push("One number");
  if (!/[^a-zA-Z0-9]/.test(pw)) errors.push("One special character");
  if (pw.length < 6) errors.push("At least 6 characters");
  return errors;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const pwErrors = validatePassword(password);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (username !== VALID_USER) {
      setError("Invalid username or password.");
      triggerShake();
      return;
    }
    if (pwErrors.length > 0) {
      setError("Password does not meet requirements.");
      triggerShake();
      return;
    }
    if (password !== VALID_PASS) {
      setError("Invalid username or password.");
      triggerShake();
      return;
    }
    localStorage.setItem("tradex-auth", "true");
    localStorage.setItem("tradex-user", username);
    onLogin();
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  return (
    <div className="login-bg">
      <div className="login-grid-lines" />
      <motion.div
        className={`login-card ${shake ? "shake" : ""}`}
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="login-brand">
          <span className="brand-mark" style={{ fontSize: "1.6rem", padding: "10px 14px" }}>TX</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>TradeX</div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Professional Trading Terminal</div>
          </div>
        </div>

        <h2 className="login-title">Sign in to your account</h2>

        <form onSubmit={handleSubmit} autoComplete="off" className="login-form">
          <div className="login-field">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <div className="pw-wrap">
              <input
                type={showPw ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <Moon size={15} /> : <Sun size={15} />}
              </button>
            </div>
          </div>

          {password.length > 0 && (
            <div className="pw-requirements">
              <div className="pw-req-title">Password requirements:</div>
              {["One lowercase letter", "One uppercase letter", "One number", "One special character", "At least 6 characters"].map((req) => (
                <div key={req} className={`pw-req ${pwErrors.includes(req) ? "fail" : "pass"}`}>
                  {pwErrors.includes(req) ? <X size={11} /> : <CheckCircle2 size={11} />}
                  <span>{req}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <motion.div className="login-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ShieldCheck size={14} /> {error}
            </motion.div>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={username.length === 0 || password.length === 0}
          >
            Sign In <TrendingUp size={16} />
          </button>
        </form>

        <div className="login-hint">
          <ShieldCheck size={13} />
          <span>Demo credentials: <strong>nikhil6273</strong> / <strong>Nikhil@1</strong></span>
        </div>
      </motion.div>
    </div>
  );
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const state = useTradeX();
  return (
    <TradeXContext.Provider value={state}>
      <Shell onLogout={onLogout} />
    </TradeXContext.Provider>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem("tradex-auth") === "true");

  function handleLogin() {
    setAuthed(true);
  }

  function handleLogout() {
    localStorage.removeItem("tradex-auth");
    localStorage.removeItem("tradex-user");
    setAuthed(false);
  }

  if (!authed) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AuthenticatedApp onLogout={handleLogout} />;
}
