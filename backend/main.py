from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import DEFAULT_LOOKBACK_YEARS, MARKET_TICKER, RISK_FREE_TICKER, TRADING_DAYS_PER_YEAR
from data.fetch_info import get_tickers_info
from data.fetch_prices import get_close_prices
from models.capm_model import expected_returns_capm, infer_betas_from_returns
from models.historical_model import expected_returns
from optimizer.optimizer import optimize as optimize_weights


app = FastAPI()

ALLOWED_ORIGINS = [
    "https://MaxmilionCarr.github.io",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OptimizeRequest(BaseModel):
    tickers: list[str]
    model: str  # "historical_average" | "capm"
    date: str | None = None         # "YYYY-MM-DD" (defaults to today)
    max_weight: float = 0.3
    max_risk: float = 1e9


@app.get("/health")
def health():
    return {"ok": True}


def _risk_free_rate() -> float:
    # IRX close is in percent, so divide by 100
    irx = yf.Ticker(RISK_FREE_TICKER)
    rate = float(irx.history(period="5d")["Close"].dropna().iloc[-1])
    return rate / 100.0



@app.post("/info")
def info(tickers: list[str] = Body(...)):
    tickers = list(dict.fromkeys(tickers))
    if not tickers:
        return {"error": "No tickers provided"}

    info = get_tickers_info(tickers)
    return {"info": info}


@app.post("/optimize")
def optimize(req: OptimizeRequest):
    tickers = list(dict.fromkeys(req.tickers))
    if not tickers:
        return {"error": "No tickers provided"}

    end = req.date or date.today().isoformat()
    y, m, d = end.split("-")
    start = f"{int(y) - DEFAULT_LOOKBACK_YEARS}-{m}-{d}"

    # 1) Fetch prices (cached)
    # For CAPM we also need market prices
    all_tickers = tickers + ([MARKET_TICKER] if req.model == "capm" else [])
    prices = get_close_prices(all_tickers, start=start, end=end)

    if prices.empty:
        return {"error": "No price data returned"}

    # 2) Compute returns
    rets = prices.pct_change().dropna()

    # Split market if needed
    if req.model == "capm":
        if MARKET_TICKER not in rets.columns:
            return {"error": f"Missing market series {MARKET_TICKER}"}
        market_rets = rets[MARKET_TICKER]
        asset_rets = rets.drop(columns=[MARKET_TICKER])
    else:
        asset_rets = rets[tickers]
        market_rets = None

    # 3) Covariance (annualised)
    cov = (asset_rets.cov() * TRADING_DAYS_PER_YEAR).values

    # 4) Expected returns μ
    rf = _risk_free_rate()

    if req.model == "historical_average":
        mu_s = expected_returns(asset_rets)
    elif req.model == "capm":
        info = get_tickers_info(tickers)
        betas = pd.Series(
            {t: (info.get(t, {}) or {}).get("beta", None) for t in tickers},
            dtype="float64",
        )

        missing = betas.isna()
        if missing.any():
            inferred = infer_betas_from_returns(asset_rets, market_rets)
            betas.loc[missing] = inferred.loc[missing.index[missing]]

        mu_s = expected_returns_capm(asset_rets, market_rets, betas, rf)
    else:
        return {"error": "Invalid model"}

    mu = mu_s.reindex(asset_rets.columns).values.astype(float)

    # 5) Optimise
    result = optimize_weights(
        tickers=tickers,
        mu=mu,
        cov=cov,
        max_weight=req.max_weight,
        max_risk=req.max_risk,
        rf=rf,
    )

    # Nice rounding for frontend display
    result["expected_return"] = round(float(result["expected_return"]), 6)
    result["volatility"] = round(float(result["volatility"]), 6)
    result["sharpe_ratio"] = round(float(result["sharpe_ratio"]), 6)
    result["min_volatility"] = round(float(result["min_volatility"]), 6)

    return result