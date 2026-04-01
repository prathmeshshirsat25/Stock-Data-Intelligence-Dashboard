from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
import math

from database import engine, Base, get_db
from models import Company, StockData, CompanyResponse, StockDataResponse, SummaryResponse
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

app = FastAPI(title="Stock Data Intelligence API")

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in a real app, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"name": "Stock Data Intelligence API", "version": "1.0", "docs": "/docs"}

def normalize_symbol(symbol: str) -> str:
    """Map user-friendly symbols to internal DB keys"""
    symbol = symbol.upper()
    aliases = {
        "INFY": "INFY.NS",
        "TCS": "TCS.NS",
        "BSE-SENSEX": "SENSEX",
        "^BSESN": "SENSEX",
        "BSESN": "SENSEX",
    }
    return aliases.get(symbol, symbol)

@app.get("/api/companies", response_model=List[CompanyResponse])
def get_companies(db: Session = Depends(get_db)):
    """Returns a list of all available companies"""
    return db.query(Company).all()

@app.get("/api/data/{symbol}", response_model=List[StockDataResponse])
def get_data(symbol: str, days: int = 30, db: Session = Depends(get_db)):
    """Returns last N days of stock data including predictions"""
    symbol = normalize_symbol(symbol)
    cutoff = datetime.now().date() - timedelta(days=days)
    records = db.query(StockData).filter(
        StockData.symbol == symbol,
        StockData.date >= cutoff
    ).order_by(StockData.date.asc()).all()
    
    if not records:
        raise HTTPException(status_code=404, detail="Data not found for symbol")
    
    return records

@app.get("/api/summary/{symbol}", response_model=SummaryResponse)
def get_summary(symbol: str, db: Session = Depends(get_db)):
    """Returns 52-week high, low, average close, and volatility score"""
    symbol = normalize_symbol(symbol)
    records = db.query(StockData).filter(
        StockData.symbol == symbol, 
        StockData.is_prediction == False
    ).all()
    
    if not records:
        raise HTTPException(status_code=404, detail="Data not found for symbol")
    
    high_52 = max(r.high for r in records if r.high is not None)
    low_52 = min(r.low for r in records if r.low is not None)
    avg_close = sum(r.close for r in records) / len(records)
    
    # Volatility Score (30-day std deviation of returns)
    last_30 = records[-30:]
    returns = [r.daily_return for r in last_30 if r.daily_return is not None]
    if len(returns) > 1:
        mean_ret = sum(returns) / len(returns)
        var_ret = sum((r - mean_ret)**2 for r in returns) / (len(returns)-1)
        volatility = math.sqrt(var_ret)
    else:
        volatility = 0.0
        
    return SummaryResponse(
        symbol=symbol,
        high_52_week=high_52,
        low_52_week=low_52,
        avg_close=avg_close,
        volatility_score=volatility
    )

@app.get("/api/market-movers")
def get_market_movers(db: Session = Depends(get_db)):
    """Returns top 2 gainers and top 2 losers based on their last recorded daily return"""
    companies = db.query(Company).all()
    returns = []
    for c in companies:
        last_record = db.query(StockData).filter(StockData.symbol == c.symbol, StockData.is_prediction == False).order_by(StockData.date.desc()).first()
        if last_record and last_record.daily_return is not None:
            returns.append({"symbol": c.symbol, "return_pct": last_record.daily_return})
            
    returns.sort(key=lambda x: x["return_pct"], reverse=True)
    return {
        "gainers": returns[:2] if len(returns) >= 2 else returns,
        "losers": returns[-2:] if len(returns) >= 2 else []
    }


@app.get("/api/compare")
def compare_stocks(symbol1: str, symbol2: str, days: int = 30, db: Session = Depends(get_db)):
    """Compare two stocks by returning their normalized prices/returns overlapping dates"""
    symbol1 = normalize_symbol(symbol1)
    symbol2 = normalize_symbol(symbol2)
    cutoff = datetime.now().date() - timedelta(days=days)
    
    recs1 = db.query(StockData).filter(StockData.symbol == symbol1, StockData.date >= cutoff, StockData.is_prediction == False).order_by(StockData.date.asc()).all()
    recs2 = db.query(StockData).filter(StockData.symbol == symbol2, StockData.date >= cutoff, StockData.is_prediction == False).order_by(StockData.date.asc()).all()
    
    if not recs1 or not recs2:
         raise HTTPException(status_code=404, detail="Not enough data to compare")
         
    # Align by date
    dict1 = {r.date: r.close for r in recs1}
    dict2 = {r.date: r.close for r in recs2}
    
    start_date = max(recs1[0].date, recs2[0].date)
    base_price1 = dict1.get(start_date, recs1[0].close)
    base_price2 = dict2.get(start_date, recs2[0].close)
    
    combined = []
    for d in sorted(set(dict1.keys()).intersection(set(dict2.keys()))):
        if d >= start_date:
            combined.append({
                "date": d,
                "symbol1_return": (dict1[d] - base_price1) / base_price1 * 100, # Percentage return since start
                "symbol2_return": (dict2[d] - base_price2) / base_price2 * 100
            })
            
    return combined

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
