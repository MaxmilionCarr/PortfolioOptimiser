from __future__ import annotations

from typing import Any, Iterable

import yfinance as yf

from config import INFO_TTL_SEC
from data.cache import CachePolicy, load_info, save_info


def get_tickers_info(tickers: Iterable[str]) -> dict[str, dict[str, Any]]:
    """
    Returns {ticker: info_dict}. Uses disk cache (json) with TTL.
    """
    tickers = list(dict.fromkeys(tickers))  # stable unique
    policy = CachePolicy(ttl_sec=INFO_TTL_SEC)

    out: dict[str, dict[str, Any]] = {}
    missing: list[str] = []

    for t in tickers:
        cached = load_info(t, policy)
        if cached is not None:
            out[t] = cached
        else:
            missing.append(t)

    if missing:
        # yfinance batch object
        yft = yf.Tickers(missing)
        for t in missing:
            info = yft.tickers[t].info or {}
            out[t] = info
            save_info(t, info)

    return out