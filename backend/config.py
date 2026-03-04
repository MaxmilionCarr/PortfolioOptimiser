import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Cache location (keep it inside backend/data/cache/)
CACHE_DIR = os.path.join(BASE_DIR, "data", "cache")
PRICES_CACHE_DIR = os.path.join(CACHE_DIR, "prices")
INFO_CACHE_DIR = os.path.join(CACHE_DIR, "info")

# Data defaults
DEFAULT_LOOKBACK_YEARS = 5
DEFAULT_INTERVAL = "1d"  # yfinance interval
MARKET_TICKER = "SPY"    # CAPM market proxy
RISK_FREE_TICKER = "^IRX"

# Cache policies (seconds)
# Prices: refresh once per day. Info: refresh weekly.
PRICES_TTL_SEC = 24 * 60 * 60
INFO_TTL_SEC = 7 * 24 * 60 * 60

TRADING_DAYS_PER_YEAR = 252

def ensure_cache_dirs() -> None:
    os.makedirs(PRICES_CACHE_DIR, exist_ok=True)
    os.makedirs(INFO_CACHE_DIR, exist_ok=True)