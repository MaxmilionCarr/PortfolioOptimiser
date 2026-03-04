from __future__ import annotations

import pandas as pd
from config import TRADING_DAYS_PER_YEAR


def expected_returns(returns: pd.DataFrame) -> pd.Series:
    """
    Annualised expected returns from historical mean daily returns.
    """
    mu = returns.mean() * TRADING_DAYS_PER_YEAR
    return mu