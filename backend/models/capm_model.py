from __future__ import annotations

import numpy as np
import pandas as pd
from config import TRADING_DAYS_PER_YEAR


def expected_returns_capm(
    asset_returns: pd.DataFrame,
    market_returns: pd.Series,
    betas: pd.Series,
    rf: float,
) -> pd.Series:
    """
    CAPM expected returns: E[R_i] = rf + beta_i * (E[Rm] - rf)
    All returns are annualised.
    """
    market_mu = float(market_returns.mean() * TRADING_DAYS_PER_YEAR)
    mu = rf + betas * (market_mu - rf)
    mu.name = "capm_mu"
    return mu


def infer_betas_from_returns(asset_returns: pd.DataFrame, market_returns: pd.Series) -> pd.Series:
    """
    Robust beta estimate from returns if yfinance beta is missing.
    beta_i = cov(r_i, r_m) / var(r_m)
    """
    m = market_returns.dropna()
    v = float(m.var())
    if v == 0:
        return pd.Series(1.0, index=asset_returns.columns)

    betas = {}
    for c in asset_returns.columns:
        r = asset_returns[c].dropna().align(m, join="inner")[0]
        m2 = m.align(asset_returns[c].dropna(), join="inner")[0]
        if len(r) < 30:
            betas[c] = 1.0
        else:
            betas[c] = float(np.cov(r.values, m2.values)[0, 1] / v)
    return pd.Series(betas)