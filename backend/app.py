# app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import historical_average as historical
import capm
import fetchinfo as fi
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REACT_BUILD_DIR = os.path.join(BASE_DIR, '../frontend/build')

app = Flask(__name__, static_folder=REACT_BUILD_DIR, static_url_path='/')
CORS(app)

@app.route('/api/optimize', methods=['POST'])
def optimize():
    data = request.get_json()
    tickers = data.get('tickers')
    date = data.get('date')
    max_weight = data.get('max_weight')
    max_risk = data.get('max_risk')
    result = capm.optimize_portfolio(tickers, date, max_weight, max_risk)
    return jsonify(result)

@app.route('/api/fetch', methods=['POST'])
def fetch():
    data = request.get_json()
    ticker = data.get('ticker')
    result = fi.fetch_info(ticker)
    return jsonify(result)

@app.route('/')
def serve_react():
    return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
