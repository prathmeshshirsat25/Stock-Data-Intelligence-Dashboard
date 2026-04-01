import { useState, useEffect } from 'react';
import { 
  fetchStockData, 
  fetchSummary 
} from '../apiClient';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceDot,
  ComposedChart, Area
} from 'recharts';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

// ── Currency helpers ───────────────────────────────────────────────
const CURRENCY_MAP = {
  USD: '$',
  INR: '₹',
};

function getCurrencyCode(symbol, fallbackCurrency = 'USD') {
  if (!symbol) return fallbackCurrency;
  const upper = symbol.toUpperCase();
  if (upper.endsWith('.NS') || upper.endsWith('.BO') || upper === '^BSESN' || upper === 'SENSEX') {
    return 'INR';
  }
  return fallbackCurrency;
}

function getCurrencySymbol(currencyCode) {
  return CURRENCY_MAP[currencyCode] || currencyCode + ' ';
}

function formatPrice(value, symbol, fallbackCurrency = 'USD', decimals = 2) {
  if (value == null || isNaN(value)) return 'N/A';
  const currencyCode = getCurrencyCode(symbol, fallbackCurrency);
  const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
  const sym = getCurrencySymbol(currencyCode);
  return `${sym}${Number(value).toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// ── Lightweight animated number (replaces react-countup) ──────────
function AnimatedValue({ end, decimals = 2, symbol, fallbackCurrency = 'USD', isPercentage = false }) {
  const [val, setVal] = useState(0);
  
  const currencyCode = Object.keys(CURRENCY_MAP).includes(fallbackCurrency) 
    ? getCurrencyCode(symbol, fallbackCurrency) 
    : fallbackCurrency;
    
  const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
  const prefix = isPercentage ? '' : getCurrencySymbol(currencyCode);
  const suffix = isPercentage ? '%' : '';

  useEffect(() => {
    if (end == null || isNaN(end)) return;
    let current = 0;
    const steps = 40;
    const increment = end / steps;
    const timer = setInterval(() => {
      current += increment;
      if ((increment >= 0 && current >= end) || (increment < 0 && current <= end)) {
        setVal(end);
        clearInterval(timer);
      } else {
        setVal(current);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [end]);

  return <span>{prefix}{Number(val).toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

// ── Animation variants ────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

// ── Main Dashboard ────────────────────────────────────────────────
function Dashboard({ symbol, companies }) {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(90);
  const [showPredictions, setShowPredictions] = useState(true);

  // Derive currency from the companies list
  const companyInfo = companies.find(c => c.symbol === symbol);
  const companyName = companyInfo?.name || symbol;
  const fallbackCurrency = companyInfo?.currency || 'USD';
  const currencyCode = getCurrencyCode(symbol, fallbackCurrency);
  const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
  const currSym = getCurrencySymbol(currencyCode);

  useEffect(() => {
    let active = true;
    
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const [historical, sumData] = await Promise.all([
          fetchStockData(symbol, timeRange),
          fetchSummary(symbol)
        ]);
        if (active) {
          setData(historical);
          setSummary(sumData);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        if (active) setError(err.message || 'Failed to load data');
      } finally {
        if (active) setLoading(false);
      }
    };
    
    loadDashboard();
    return () => { active = false; };
  }, [symbol, timeRange]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading market data...</p>
      </div>
    );
  }

  // ── Error / empty-data fallback ────────────────────────────────
  if (error || !data || data.length === 0) {
    return (
      <motion.div 
        className="dashboard-wrapper"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants} className="header">
          <h1>{symbol} Market Intelligence</h1>
          <p>{companyName} • Interactive Analytics</p>
        </motion.div>
        <motion.div 
          variants={itemVariants} 
          className="glass-panel premium-border" 
          style={{ padding: 40, textAlign: 'center', marginTop: 24 }}
        >
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No Data Available</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {error || `No historical data was found for ${symbol}. The data source may not support this ticker, or it hasn't been fetched yet.`}
          </p>
        </motion.div>
      </motion.div>
    );
  }

  // ── Pre-process Data for Chart ─────────────────────────────────
  const hasPredictions = data.some(d => d.is_prediction);
  const chartData = data.map(d => ({
    ...d,
    displayClose: d.is_prediction ? null : d.close,
    displayPredict: d.is_prediction
      ? d.predicted_close
      : (showPredictions && hasPredictions ? d.close : null),
    formattedDate: format(new Date(d.date), 'MMM dd')
  }));

  const lastRealClose = data.filter(d => !d.is_prediction).pop()?.close || 0;
  
  // ── Custom tooltip with proper currency ────────────────────────
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ 
        background: 'rgba(15, 23, 42, 0.95)', 
        border: '1px solid rgba(255,255,255,0.1)', 
        borderRadius: 8, 
        padding: '10px 14px',
        color: '#fff',
        fontSize: 13 
      }}>
        <p style={{ color: '#94a3b8', marginBottom: 6 }}>{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color, margin: '2px 0' }}>
            {entry.name}: {formatPrice(entry.value, symbol, fallbackCurrency)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <motion.div 
      className="dashboard-wrapper"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{symbol} Market Intelligence</h1>
          <p>{companyName} • Interactive Analytics</p>
        </div>
        
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="filters premium-border glass-panel" style={{ padding: '4px', margin: 0, display: 'flex' }}>
            <button className={`filter-btn ${timeRange === 30 ? 'active' : ''}`} onClick={() => setTimeRange(30)}>30D</button>
            <button className={`filter-btn ${timeRange === 90 ? 'active' : ''}`} onClick={() => setTimeRange(90)}>90D</button>
            <button className={`filter-btn ${timeRange === 180 ? 'active' : ''}`} onClick={() => setTimeRange(180)}>6M</button>
          </div>
          
          {hasPredictions && (
            <div className="toggle-container premium-border glass-panel" style={{ padding: '8px 16px', margin: 0 }}>
              <span>AI Predictions</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={showPredictions} onChange={(e) => setShowPredictions(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
          )}
        </div>
      </motion.div>

      {/* Metric Cards Grid */}
      {summary && (
        <motion.div variants={containerVariants} className="metrics-grid">
          <motion.div variants={itemVariants} className="glass-card premium-border metric-card hover-glow">
            <span className="metric-label">Current Close</span>
            <span className="metric-value">
              <AnimatedValue end={lastRealClose} decimals={2} symbol={symbol} fallbackCurrency={fallbackCurrency} />
            </span>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-card premium-border metric-card hover-glow">
            <span className="metric-label">52W High</span>
            <span className="metric-value" style={{ color: 'var(--success-color)' }}>
              {summary.high_52_week != null ? <AnimatedValue end={summary.high_52_week} decimals={2} symbol={symbol} fallbackCurrency={fallbackCurrency} /> : 'N/A'}
            </span>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-card premium-border metric-card hover-glow">
            <span className="metric-label">52W Low</span>
            <span className="metric-value" style={{ color: 'var(--danger-color)' }}>
              {summary.low_52_week != null ? <AnimatedValue end={summary.low_52_week} decimals={2} symbol={symbol} fallbackCurrency={fallbackCurrency} /> : 'N/A'}
            </span>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-card premium-border metric-card hover-glow">
            <span className="metric-label">Volatility Score (30d)</span>
            <span className="metric-value" style={{ color: 'var(--accent-color)' }}>
              <AnimatedValue end={summary.volatility_score * 100} decimals={2} isPercentage={true} />
            </span>
            <span className="metric-trend">Expected daily fluctuation</span>
          </motion.div>
        </motion.div>
      )}

      {/* Main Chart */}
      <motion.div variants={itemVariants} className="glass-panel premium-border chart-container hover-glow chart-container-inner" style={{ transition: 'all 0.4s ease' }}>
        <h3 style={{ marginBottom: 16, fontSize: 16, color: 'var(--text-secondary)' }}>
          Price {hasPredictions ? '& ML Predictions' : 'History'}
        </h3>
        <ResponsiveContainer width="100%" height="85%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
            <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} minTickGap={30} />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              domain={['auto', 'auto']} 
              tickFormatter={(v) => v != null ? `${currSym}${Number(v).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : ''} 
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Real Data Area & Line */}
            <Area type="monotone" dataKey="displayClose" stroke="none" fill="url(#colorClose)" />
            <Line type="monotone" dataKey="displayClose" stroke="#38bdf8" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }} name="Actual Price" />
            
            {/* Prediction Line */}
            {showPredictions && hasPredictions && (
              <Line type="monotone" dataKey="displayPredict" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#f59e0b' }} name="7-Day ML Forecast" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}

export default Dashboard;
