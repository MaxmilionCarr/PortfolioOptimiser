from __future__ import annotations

from datetime import date, datetime
from typing import Iterable

import pandas as pd
import yfinance as yf

from config import DEFAULT_INTERVAL, PRICES_TTL_SEC
from data.cache import CachePolicy, load_prices, save_prices


def _to_yyyy_mm_dd(d: str | date | datetime) -> str:
    if isinstance(d, str):
        return d
    if isinstance(d, datetime):
        return d.date().isoformat()
    return d.isoformat()


def get_close_prices(
    tickers: Iterable[str],
    start: str | date | datetime,
    end: str | date | datetime,
    interval: str = DEFAULT_INTERVAL,
) -> pd.DataFrame:
    """
    Returns a DataFrame of Close prices indexed by date with columns=tickers.
    Uses per-ticker parquet cache (TTL-based). Falls back to yfinance as needed.
    """
    tickers = list(dict.fromkeys(tickers))
    start_s = _to_yyyy_mm_dd(start)
    end_s = _to_yyyy_mm_dd(end)

    policy = CachePolicy(ttl_sec=PRICES_TTL_SEC)

    series: dict[str, pd.Series] = {}
    missing: list[str] = []

    for t in tickers:
        cached = load_prices(t, interval, policy)
        if cached is None:
            missing.append(t)
        else:
            # Slice to requested window
            s = cached.loc[(cached.index >= start_s) & (cached.index <= end_s)]
            # If cache doesn't cover requested range well, refetch.
            if s.empty:
                missing.append(t)
            else:
                series[t] = s

    if missing:
        # Batch download missing tickers
        df = yf.download(
            tickers=missing,
            start=start_s,
            end=end_s,
            interval=interval,
            auto_adjust=False,
            progress=False,
            group_by="column",
            threads=True,
        )

        # yfinance can return:
        # - columns: ["Open","High","Low","Close",...] for single ticker
        # - MultiIndex columns (field, ticker) for multiple
        if isinstance(df.columns, pd.MultiIndex):
            close = df["Close"]
        else:
            close = df["Close"].to_frame()
            close.columns = missing

        close.index = pd.to_datetime(close.index)

        for t in missing:
            s = close[t].dropna()
            s.name = t
            if not s.empty:
                series[t] = s
                save_prices(t, interval, s)

    # Align all series into one df
    if not series:
        return pd.DataFrame()

    prices = pd.concat(series.values(), axis=1).sort_index()
    # final slice (ensures consistent bounds after concat)
    prices = prices.loc[(prices.index >= start_s) & (prices.index <= end_s)]
    return prices