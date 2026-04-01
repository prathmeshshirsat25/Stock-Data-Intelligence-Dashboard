
# Stock Data Intelligence Dashboard

A full-stack, AI-powered stock data platform built for my internship assignment. This application features an immaculate, interactive UI providing real-time analytics, historical comparisons, and ML-powered price predictions for major stocks (Apple, Microsoft, Google, Infosys, and TCS).

## Tech Stack
- **Frontend**: React, Vite, Framer Motion (for fluid micro-animations), Recharts (for dynamic SVG charts), CSS Variables structure.
- **Backend**: Python, FastAPI, SQLite, Scikit-Learn (Linear Regression for forecasting), yfinance (Data sourcing).

## Features
1. **Interactive Dashboard**: View historical context with 30D/90D/180D dynamic ranges.
2. **AI Price Forecasting**: Toggles for 7-day Simple Linear Regression projections directly overlaid on the actuals.
3. **Intelligent Summaries**: Instant calculation of 52-week High/Lows and statistical 30-day volatility scores.
4. **Market Movers Overview**: Instantly track daily top gainers and losers.
5. **Absolute Comparison Mode**: Dual-axis percentage-normalized charting to visually correlate assets like `INFY` and `TCS`.

##  Project Logic
The core platform operates through an automated data pipeline and a responsive frontend interface:
- **Data Collection pipeline:** The backend uses `yfinance` and `pandas` to collect the last year of stock market data. All missing values are actively handled via forward-filling (`ffill`) and dropping extreme outliers, maintaining cleanly structured date-normalized datasets.
- **Derived Metrics Strategy:** Beyond raw OHLCV prices, the system automatically computes normalized **Daily Returns**, **7-day Moving Averages**, and statistical **30-day Volatility Scores** derived directly from standard deviation arrays.
- **Predictive ML Modeling:** A scikit-learn Linear Regression model intercepts the transformed time series and outputs a continuous 7-day predictive forecast that is seamlessly appended to the API response.

##  API Details & Documentation
This backend runs on FastAPI, meaning fully interactive, automatically generated OpenAPI (Swagger) documentation is available out of the box.

Once the backend is running, visit:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Core Endpoints
- `GET /api/companies` - Fetches the list of all supported tickers and their metadata.
- `GET /api/data/{symbol}?days=90` - Returns historical prices, moving averages, daily returns, and ML-injected future predictions for the specified ticker.
- `GET /api/summary/{symbol}` - Provides top-level statistical metrics including 52-week High/Lows, average close, and historical volatility.
- `GET /api/compare?symbol1={ticker}&symbol2={ticker}` - Computes relative percentage changes baseline-aligned for accurate multi-asset comparison.

##  Key Insights
- **Standardized Volatility Correlation:** By calculating 30-day volatility as a custom metric, it becomes significantly easier to identify high-risk vs. blue-chip asset profiles directly from numerical dispersion rather than manual visual chart inspection.
- **Normalization for Comparison:** Normalizing initial tracking prices to `0%` is critical; comparing absolute metrics between \$3,400 TATA and \$150 AAPL provides falsely skewed visualization charts. This platform handles it natively.

---

##  How to Run (Docker / Fastest)
The recommended, one-click evaluation method is via Docker. Ensure Docker Desktop is running.

```bash
docker-compose up --build
```
- **UI:** [http://localhost:5173](http://localhost:5173)
- **API:** [http://localhost:8000/docs](http://localhost:8000/docs)

*(Note: On first boot, the backend fetches fresh historical data before starting the server. This takes ~5-10 seconds).*

---

## 🛠 How to Run (Local / Native)

### 1. Start the Backend API
The backend dynamically pulls live quotes and seeds an internal SQLite database (`stock_data.db`).

Open a terminal in the project root (`stock_dashboard/backend`) and run:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python data_fetcher.py
uvicorn main:app --reload
```
*The backend will be available at: http://localhost:8000*

### 2. Start the Frontend UI
The UI is driven by Vite's dev server. Open a new terminal in `stock_dashboard/frontend`:
```bash
npm install
npm run dev
```
*The UI will automatically open at: http://localhost:5173*

## Testing Notes
- For the `/compare` endpoint, you can test it directly via: `http://localhost:8000/api/compare?symbol1=INFY&symbol2=TCS`
- Try toggling the "AI Predictions" switch on the main dashboard to visualize the projected forecast.

# Stock-Data-Intelligence-Dashboard
Full-stack financial market dashboard built with FastAPI, React, Vite, and SQLite. It fetches, processes, stores, and visualizes stock data through APIs, charts, company summaries, top movers, and trend insights, demonstrating backend, database, API, and frontend integration in one project.

