# app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os

import historical_average as historical
import capm

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REACT_BUILD_DIR = os.path.join(BASE_DIR, '../frontend/build')

app = Flask(__name__, static_folder=REACT_BUILD_DIR, static_url_path='/')
CORS(app)

@app.route('/api/optimize', methods=['POST'])
def optimize():
    """
    Expects JSON:
      {
        "tickers": ["AAPL","MSFT",…],
        "date": "YYYY-MM-DD",
        "max_weight": 0.1,
        "max_risk": 0.2
      }
    Returns the optimised weights + performance.
    """

    data = request.get_json()
    tickers = data.get('tickers', [])
    date = data.get('date')
    max_weight = data.get('max_weight', 1.0)
    max_risk = data.get('max_risk', 1.0)
    result = capm.optimize_portfolio(tickers, date, max_weight, max_risk)
    return jsonify(result)

@app.route('/api/info', methods=['POST'])
def info():
    """
    Expects JSON:
      { "ticker": "AAPL" }
    Returns the full yfinance .info dict for that ticker,
    pulled (and cached) via capm.get_all_info().
    """
    ticker = request.get_json().get('ticker')
    if not ticker:
        return jsonify({'error': 'No ticker provided'}), 400
    
    info_dict = capm.get_all_info([ticker]).get(ticker, {})
    return jsonify(info_dict)

@app.route('/api/minimum', methods=['POST'])
def minimum_volatility():
    """
    Expects JSON:
      {
        "tickers": ["AAPL","MSFT",…],
        "date": "YYYY-MM-DD",
        "max_weight": 0.1,
      }
    Returns the minimum risk of portfolio.
    """
    data = request.get_json()
    tickers = data['tickers']
    date = data['date']
    max_weight = data['max_weight']
    min_vol = capm.get_minimum_volatility(tickers, date, max_weight)
    return jsonify(min_vol)

# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    """
    If the path matches a static asset in build/, serve it.
    Otherwise fall back to index.html (for client‐side routing).
    """
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
