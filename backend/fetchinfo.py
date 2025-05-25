import yfinance as yf

def fetch_info(ticker):
    try:
        stock = yf.Ticker(ticker)
    except Exception as e:
        return f'{e} occured'
    
    price = stock.history(period="1d")['Close'][0]
    full_name = stock.info['longName']
    sector = stock.info['sector']
    industry = stock.info['industry']
    return {
        'price': round(price.item(), 2),
        'full_name': full_name,
        'sector': sector,
        'industry': industry
    }

# Tester
# print(fetch_info('AAPL'))

