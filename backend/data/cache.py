from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from typing import Any, Optional

import pandas as pd

from config import INFO_CACHE_DIR, PRICES_CACHE_DIR, ensure_cache_dirs


@dataclass(frozen=True)
class CachePolicy:
    ttl_sec: int


def _is_fresh(path: str, ttl_sec: int) -> bool:
    if not os.path.exists(path):
        return False
    age = time.time() - os.path.getmtime(path)
    return age <= ttl_sec


def _prices_path(ticker: str, interval: str) -> str:
    safe = ticker.replace("^", "_").replace("/", "_")
    return os.path.join(PRICES_CACHE_DIR, f"{safe}.{interval}.parquet")


def _info_path(ticker: str) -> str:
    safe = ticker.replace("^", "_").replace("/", "_")
    return os.path.join(INFO_CACHE_DIR, f"{safe}.json")


def load_prices(ticker: str, interval: str, policy: CachePolicy) -> Optional[pd.Series]:
    ensure_cache_dirs()
    path = _prices_path(ticker, interval)
    if not _is_fresh(path, policy.ttl_sec):
        return None
    df = pd.read_parquet(path)
    if "Close" not in df.columns:
        return None
    s = df["Close"]
    s.index = pd.to_datetime(s.index)
    s.name = ticker
    return s


def save_prices(ticker: str, interval: str, close: pd.Series) -> None:
    ensure_cache_dirs()
    path = _prices_path(ticker, interval)
    df = pd.DataFrame({"Close": close.astype(float)})
    df.index = pd.to_datetime(df.index)
    df.to_parquet(path, index=True)


def load_info(ticker: str, policy: CachePolicy) -> Optional[dict[str, Any]]:
    ensure_cache_dirs()
    path = _info_path(ticker)
    if not _is_fresh(path, policy.ttl_sec):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_info(ticker: str, info: dict[str, Any]) -> None:
    ensure_cache_dirs()
    path = _info_path(ticker)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(info, f)