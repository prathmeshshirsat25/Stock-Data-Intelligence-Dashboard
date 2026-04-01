import yfinance as yf
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
import warnings

from database import engine, Base, SessionLocal
from models import Company, StockData

# Ignore simple pandas warnings for clarity
warnings.filterwarnings('ignore')

# symbol_key -> { ticker (for yfinance), name, currency }
COMPANIES = {
    "AAPL":    {"ticker": "AAPL",    "name": "Apple Inc.",                  "currency": "USD"},
    "MSFT":    {"ticker": "MSFT",    "name": "Microsoft Corp.",              "currency": "USD"},
    "GOOGL":   {"ticker": "GOOGL",   "name": "Alphabet Inc.",               "currency": "USD"},
    "SENSEX":  {"ticker": "^BSESN",  "name": "BSE Sensex",                  "currency": "INR"},
    "INFY.NS": {"ticker": "INFY.NS", "name": "Infosys Ltd",                 "currency": "INR"},
    "TCS.NS":  {"ticker": "TCS.NS",  "name": "Tata Consultancy Services",   "currency": "INR"},
}

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Remove stale entries (e.g. old BSE-SENSEX)
    db.query(Company).filter(~Company.symbol.in_(list(COMPANIES.keys()))).delete(synchronize_session=False)
    for symbol, info in COMPANIES.items():
        existing = db.query(Company).filter(Company.symbol == symbol).first()
        if not existing:
            db.add(Company(symbol=symbol, name=info["name"], currency=info["currency"]))
        elif existing.name != info["name"] or existing.currency != info["currency"]:
            existing.name = info["name"]
            existing.currency = info["currency"]
    db.commit()
    db.close()

def predict_future_prices(df, days=7):
    """
    Given a dataframe of historical data with 'close' price,
    predict the next 'days' using strict simple Linear Regression on an index.
    Returns a dataframe of predicted future rows.
    """
    df = df.dropna(subset=['close']).copy()
    if len(df) < 14:
        return pd.DataFrame() # Not enough data

    # Prepare data for LR
    df['day_index'] = np.arange(len(df))
    X = df[['day_index']].values
    y = df['close'].values

    model = LinearRegression()
    model.fit(X, y)

    last_date = pd.to_datetime(df['date'].iloc[-1])
    last_index = df['day_index'].iloc[-1]
    
    future_dates = [last_date + timedelta(days=i) for i in range(1, days + 1)]
    # Filter out weekends (simplified)
    valid_dates = [d for d in future_dates if d.weekday() < 5]
    if len(valid_dates) < days:
        extra_days = [last_date + timedelta(days=i) for i in range(days + 1, days + 1 + (days - len(valid_dates)) * 2)]
        valid_dates.extend([d for d in extra_days if d.weekday() < 5])
        valid_dates = valid_dates[:days]

    future_X = np.array([[last_index + i] for i in range(1, len(valid_dates) + 1)])
    future_y = model.predict(future_X)

    preds = []
    for i in range(len(valid_dates)):
        preds.append({
            'date': valid_dates[i].date(),
            'close': future_y[i],
            'predicted_close': future_y[i],
            'is_prediction': True
        })
    return pd.DataFrame(preds)

def sync_data():
    db = SessionLocal()
    
    # We fetch last 1 year to get 52-week High/Low and proper 7-day MA.
    for symbol, info in COMPANIES.items():
        yf_ticker = info["ticker"]
        print(f"Fetching data for {symbol} (ticker: {yf_ticker})...")
        ticker = yf.Ticker(yf_ticker)
        df = ticker.history(period="1y")
        
        if df.empty:
            continue
            
        df = df.reset_index()
        # Ensure date format
        if 'Date' in df.columns:
            df['Date'] = pd.to_datetime(df['Date']).dt.date
        elif 'Datetime' in df.columns:
            df['Date'] = pd.to_datetime(df['Datetime']).dt.date
        
        # Lowercase columns to match models
        df = df.rename(columns={'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'})
        
        # Forward fill any missing values
        df = df.ffill()

        # Calculate metrics
        df['daily_return'] = (df['close'] - df['open']) / df['open']
        df['ma_7_day'] = df['close'].rolling(window=7).mean()
        df['is_prediction'] = False
        df['predicted_close'] = None

        # Calculate future predictions
        future_df = predict_future_prices(df, days=7)
        if not future_df.empty:
             # Ensure future_df has required columns
             for col in ['open', 'high', 'low', 'volume', 'daily_return', 'ma_7_day']:
                 future_df[col] = None
             future_df['symbol'] = symbol
             df = pd.concat([df, future_df], ignore_index=True)

        # Clear existing data for this symbol to avoid duplicates on multiple runs
        db.query(StockData).filter(StockData.symbol == symbol).delete()
        
        # Save to DB
        records_to_insert = []
        for _, row in df.iterrows():
            record = StockData(
                symbol=symbol,
                date=row['date'],
                open=row['open'] if pd.notna(row.get('open')) else None,
                high=row['high'] if pd.notna(row.get('high')) else None,
                low=row['low'] if pd.notna(row.get('low')) else None,
                close=row['close'],
                volume=int(row['volume']) if pd.notna(row.get('volume')) else 0,
                daily_return=row['daily_return'] if pd.notna(row.get('daily_return')) else None,
                ma_7_day=row['ma_7_day'] if pd.notna(row.get('ma_7_day')) else None,
                predicted_close=row['predicted_close'] if pd.notna(row.get('predicted_close')) else None,
                is_prediction=row['is_prediction']
            )
            records_to_insert.append(record)
        
        db.bulk_save_objects(records_to_insert)
        db.commit()
    
    db.close()
    print("Data synchronization complete.")

if __name__ == "__main__":
    init_db()
    sync_data()
