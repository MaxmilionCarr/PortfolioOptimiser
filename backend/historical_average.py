import yfinance as yf
import numpy as np
from scipy.optimize import minimize

def optimize_portfolio(tickers, date, max_weight, max_risk):
    start = str(int(date.split('-')[0]) - 5) + '-' + ('-').join(date.split('-')[1:])

    try:
        # Download price data
        raw_data = yf.download(tickers, start, date)

    except Exception as e:
        return {'error': str(e)}

    # Calculate daily returns
    data = raw_data['Close']
    returns = data.pct_change().dropna()

    # Annualize data
    mean_returns = returns.mean() * 252
    cov_matrix = returns.cov() * 252

    # Portfolio performance
    def portfolio_perf(weights):
        port_return = np.dot(weights, mean_returns)
        port_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
        return port_return, port_vol

    # Objective: maximize Sharpe ratio = minimize negative Sharpe
    def negative_sharpe(weights):
        port_return, port_vol = portfolio_perf(weights)
        return -port_return / port_vol

    num_assets = len(tickers)
    init_guess = [1 / num_assets] * num_assets
    bounds = [(0, max_weight)] * num_assets
    constraints = [{'type': 'eq', 'fun': lambda w: np.sum(w) - 1}]

    min_vol_result = minimize(
        lambda w: np.sqrt(np.dot(w.T, np.dot(cov_matrix, w))),
        x0=init_guess,
        method='SLSQP',
        bounds=bounds,
        constraints=constraints
    )

    if not min_vol_result.success:
        return {'error': 'Minimum volatility check failed'}

    min_vol = min_vol_result.fun
    if max_risk > 0 and max_risk < min_vol:
        max_risk = min_vol
    
    if max_risk > 0:
        constraints.append({
            'type': 'ineq',
            'fun': lambda x: max_risk - portfolio_perf(x)[1]
        })

    # Run optimization
    result = minimize(negative_sharpe, init_guess, method='SLSQP',
                      bounds=bounds, constraints=constraints)

    if not result.success:
        return {'error': 'Optimization failed'}

    opt_weights = result.x
    opt_return, opt_vol = portfolio_perf(opt_weights)

    return {
        "tickers": list(tickers),
        "weights": list([x.item() for x in opt_weights]),
        "expected_return": round(opt_return, 4).item(),
        "volatility": round(opt_vol, 4).item(),
        "sharpe_ratio": round(opt_return / opt_vol, 4).item(),
        "min_vol": min_vol
    }

# Tester
# print(optimize_portfolio(['AAPL', 'GOOGL', 'NVDA'], '2025-05-25', 1, 0.4))