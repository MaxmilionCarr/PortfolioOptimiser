from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os

import historical_average as historical
import capm

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REACT_BUILD_DIR = os.path.join(BASE_DIR, '../frontend/build')

app = Flask(__name__, static_folder=REACT_BUILD_DIR, static_url_path='/')

# --- CORS CONFIG ---
ALLOWED_ORIGINS = [
    # GitHub Pages (user site)
    "https://MaxmilionCarr.github.io",
    # (Optional) restrict to the repo site path isn’t necessary; origin checks ignore path:
    # "https://maxmilioncarr.github.io/PortfolioOptimiser",

    # Local dev (React)
    "http://localhost:3000",
    "http://127.0.0.1:3000",

    # (Later) your custom domain for the frontend, if you add one:
    # "https://portfolio.yourdomain.com",
]

CORS(app,
     resources={r"/api/*": {
         "origins": ALLOWED_ORIGINS,
         "methods": ["GET", "POST", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": False  # set True only if you use cookies/auth headers across origins
     }})
# --------------------
@app.get("/api/health")
def health():
    return {"ok": True}

@app.route('/api/optimize', methods=['POST'])
def optimize():
    data = request.get_json()
    type_ = data.get('type')
    tickers = data.get('tickers', [])
    date = data.get('date')
    max_weight = data.get('max_weight', 1.0)
    max_risk = data.get('max_risk', 1.0)

    if type_ == 'capm':
        result = capm.optimize_portfolio(tickers, date, max_weight, max_risk)
    else:
        result = historical.optimize_portfolio(tickers, date, max_weight, max_risk)
    return jsonify(result)

@app.route('/api/info', methods=['POST'])
def info():
    ticker = request.get_json().get('ticker')
    if not ticker:
        return jsonify({'error': 'No ticker provided'}), 400
    info_dict = capm.get_all_info([ticker]).get(ticker, {})
    return jsonify(info_dict)

@app.route('/api/minimum', methods=['POST'])
def minimum_volatility():
    data = request.get_json()
    tickers = data['tickers']
    date = data['date']
    max_weight = data['max_weight']
    min_vol = capm.get_minimum_volatility(tickers, date, max_weight)
    return jsonify(min_vol)

# Serve React (only useful if you also serve frontend from Flask; safe to keep)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
