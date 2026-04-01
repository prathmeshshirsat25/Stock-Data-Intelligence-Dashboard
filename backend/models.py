from sqlalchemy import Column, Integer, String, Float, Date, Boolean
from database import Base
from pydantic import BaseModel
from datetime import date
from typing import Optional, List

# SQLAlchemy Models
class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    currency = Column(String, default="USD")

class StockData(Base):
    __tablename__ = "stock_data"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    date = Column(Date, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Integer)
    daily_return = Column(Float, nullable=True)
    ma_7_day = Column(Float, nullable=True)
    predicted_close = Column(Float, nullable=True)
    is_prediction = Column(Boolean, default=False)

# Pydantic Schemas
class CompanyResponse(BaseModel):
    symbol: str
    name: str
    currency: str = "USD"
    
    class Config:
        from_attributes = True

class StockDataResponse(BaseModel):
    date: date
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: Optional[int] = None
    daily_return: Optional[float] = None
    ma_7_day: Optional[float] = None
    predicted_close: Optional[float] = None
    is_prediction: bool

    class Config:
        from_attributes = True

class SummaryResponse(BaseModel):
    symbol: str
    high_52_week: float
    low_52_week: float
    avg_close: float
    volatility_score: float

class CompareResponse(BaseModel):
    date: date
    symbol1_return: float
    symbol2_return: float
