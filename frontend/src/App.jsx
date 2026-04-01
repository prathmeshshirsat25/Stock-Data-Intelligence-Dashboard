import { useState, useEffect } from 'react';
import './index.css';
import { fetchCompanies, fetchMarketMovers } from './apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';

const Activity = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const TrendingUp = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />
  </svg>
);

const TrendingDown = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 17h6v-6" /><path d="m22 17-8.5-8.5-5 5L2 7" />
  </svg>
);

const AnimatedBackground = () => (
  <div className="animated-bg">
    <div className="orb orb-1"></div>
    <div className="orb orb-2"></div>
    <div className="orb orb-3"></div>
  </div>
);

function App() {
  const [companies, setCompanies] = useState([]);
  const [marketMovers, setMarketMovers] = useState({ gainers: [], losers: [] });
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const [companyData, moversData] = await Promise.all([
          fetchCompanies(),
          fetchMarketMovers()
        ]);
        setCompanies(companyData);
        setMarketMovers(moversData);
        if (companyData.length > 0) {
          setSelectedSymbol(companyData[0].symbol);
        }
      } catch (err) {
        console.error("Failed to load companies", err);
      } finally {
        setLoading(false);
      }
    };
    loadCompanies();
  }, []);

  if (loading) {
    return (
      <>
        <AnimatedBackground />
        <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: 16 }}>Loading Intelligence...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <AnimatedBackground />
      <div className="app-container">
      {/* Sidebar */}
      <motion.aside 
        className="sidebar"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.2)', padding: 8, borderRadius: 8 }}>
            <Activity color="#38bdf8" size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>StockIntel</h2>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>PREMIUM DASHBOARD</p>
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, marginTop: 16 }}>
          MARKETS
        </div>
        <div className="company-list">
          {companies.map((c, idx) => (
             <motion.div 
               key={c.symbol} 
               className={`company-item ${selectedSymbol === c.symbol ? 'active' : ''}`}
               onClick={() => setSelectedSymbol(c.symbol)}
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: idx * 0.05 + 0.2 }}
               whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
               whileTap={{ scale: 0.98 }}
             >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="symbol">{c.symbol}</span>
                  <span className="name">{c.name}</span>
                </div>
                {selectedSymbol === c.symbol && <TrendingUp size={16} color="var(--accent-color)" />}
             </motion.div>
          ))}
        </div>

        {/* Market Movers */}
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, marginTop: 24, marginBottom: 8 }}>
          TOP MOVERS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
           {marketMovers.gainers.map((m, idx) => {
             const pct = (m.return_pct || 0) * 100;
             const isPositive = pct >= 0;
             return (
               <motion.div 
                 key={m.symbol} 
                 className="glass-panel" 
                 style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.5 + (idx * 0.1) }}
               >
                 <span style={{ fontWeight: 600 }}>{m.symbol}</span>
                 <span style={{ color: isPositive ? 'var(--success-color)' : 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: 4 }}>
                   {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                   {isPositive ? '+' : ''}{pct.toFixed(2)}%
                 </span>
               </motion.div>
             );
           })}
           {marketMovers.losers.map((m, idx) => {
             const pct = (m.return_pct || 0) * 100;
             const isPositive = pct >= 0;
             return (
               <motion.div 
                 key={m.symbol} 
                 className="glass-panel" 
                 style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.7 + (idx * 0.1) }}
               >
                 <span style={{ fontWeight: 600 }}>{m.symbol}</span>
                 <span style={{ color: isPositive ? 'var(--success-color)' : 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: 4 }}>
                   {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                   {isPositive ? '+' : ''}{pct.toFixed(2)}%
                 </span>
               </motion.div>
             );
           })}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          {selectedSymbol && (
            <motion.div
              key={selectedSymbol}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ height: '100%' }}
            >
              <Dashboard symbol={selectedSymbol} companies={companies} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
    </>
  );
}

export default App;
