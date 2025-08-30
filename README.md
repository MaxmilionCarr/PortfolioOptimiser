Portfolio Optimiser
A full-stack web application for portfolio analysis and optimisation.
Built with a React frontend and a Flask backend, and deployed using GitHub Pages (frontend) and AWS EC2 with Nginx & Gunicorn (backend).
Try it out here: https://portoptimiser.duckdns.org

The app allows users to:
- Input stock tickers and constraints
- Optimise portfolios using CAPM or historical average models
- Fetch live company data from Yahoo Finance
- Visualise weights, risks, and expected returns interactively


Tech Stack
Frontend
- React
- Axios
- Deployed with GitHub Pages

Backend
- Flask
- Gunicorn
- Nginx
- yfinance
- Hosted on AWS EC2 (Ubuntu)

DevOps
GitHub Actions CI/CD for frontend deployment
Let’s Encrypt / Certbot for HTTPS
Environment variables for configuration
