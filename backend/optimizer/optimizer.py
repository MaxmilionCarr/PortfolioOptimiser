from __future__ import annotations

import numpy as np
from scipy.optimize import minimize


def _port_return(w: np.ndarray, mu: np.ndarray) -> float:
    return float(w @ mu)


def _port_vol(w: np.ndarray, cov: np.ndarray) -> float:
    return float(np.sqrt(w @ cov @ w))


def optimize(
    tickers: list[str],
    mu: np.ndarray,
    cov: np.ndarray,
    *,
    max_weight: float = 0.3,
    max_risk: float = 1e9,
    rf: float = 0.0,
) -> dict:
    """
    Long-only SLSQP:
      1) Find minimum volatility portfolio (sum w = 1, 0<=w<=max_weight)
      2) If min-vol > max_risk: return min-vol portfolio
      3) Else maximize Sharpe ratio with volatility constraint vol<=max_risk
    """
    n = len(tickers)
    mu = np.asarray(mu, dtype=float).reshape(n)
    cov = np.asarray(cov, dtype=float).reshape(n, n)

    bounds = [(0.0, float(max_weight))] * n
    x0 = np.ones(n) / n

    cons_sum1 = {"type": "eq", "fun": lambda w: np.sum(w) - 1.0}

    # Step 1: min vol
    res_min = minimize(
        fun=lambda w: _port_vol(w, cov),
        x0=x0,
        method="SLSQP",
        bounds=bounds,
        constraints=[cons_sum1],
    )

    w_min = res_min.x
    min_vol = _port_vol(w_min, cov)
    ret_min = _port_return(w_min, mu)
    sharpe_min = (ret_min - rf) / (min_vol if min_vol > 0 else 1e-12)

    if min_vol > max_risk:
        return {
            "tickers": tickers,
            "weights": w_min.astype(float).tolist(),
            "expected_return": float(ret_min),
            "volatility": float(min_vol),
            "sharpe_ratio": float(sharpe_min),
            "min_volatility": float(min_vol),
        }

    # Step 2: max sharpe under vol constraint
    cons = [
        cons_sum1,
        {"type": "ineq", "fun": lambda w: float(max_risk) - _port_vol(w, cov)},
    ]

    res_sh = minimize(
        fun=lambda w: -((_port_return(w, mu) - rf) / (_port_vol(w, cov) + 1e-12)),
        x0=w_min,
        method="SLSQP",
        bounds=bounds,
        constraints=cons,
    )

    w = res_sh.x
    vol = _port_vol(w, cov)
    ret = _port_return(w, mu)
    sharpe = (ret - rf) / (vol if vol > 0 else 1e-12)

    return {
        "tickers": tickers,
        "weights": w.astype(float).tolist(),
        "expected_return": float(ret),
        "volatility": float(vol),
        "sharpe_ratio": float(sharpe),
        "min_volatility": float(min_vol),
    }