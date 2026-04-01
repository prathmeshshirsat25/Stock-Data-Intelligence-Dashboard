const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');
console.log('API_BASE currently is:', API_BASE, 'Cache Buster: ', Date.now());
export const fetchCompanies = async () => {
  const response = await fetch(`${API_BASE}/companies`);
  if (!response.ok) throw new Error('Failed to fetch companies');
  return response.json();
};

export const fetchStockData = async (symbol, days = 90) => {
  const url = `${API_BASE}/data/${symbol}?days=${days}`;
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${text}`);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Parse Error for ${url}: ${text.substring(0, 40)}`);
  }
};

export const fetchSummary = async (symbol) => {
  const url = `${API_BASE}/summary/${symbol}`;
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${text}`);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Parse Error for ${url}: ${text.substring(0, 40)}`);
  }
};

export const fetchComparison = async (symbol1, symbol2, days = 90) => {
  const response = await fetch(`${API_BASE}/compare?symbol1=${symbol1}&symbol2=${symbol2}&days=${days}`);
  if (!response.ok) throw new Error('Failed to fetch comparison');
  return response.json();
};

export const fetchMarketMovers = async () => {
  const response = await fetch(`${API_BASE}/market-movers`);
  if (!response.ok) throw new Error('Failed to fetch market movers');
  return response.json();
};

