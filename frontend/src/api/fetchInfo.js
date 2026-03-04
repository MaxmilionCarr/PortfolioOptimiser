import { api } from "./client";

export async function getInfos(tickers) {
  const uniq = [...new Set(tickers.map(t => t.trim().toUpperCase()))].filter(Boolean);
  if (!uniq.length) return {};
  const res = await api.post("/info", uniq); // JSON array body
  return res.data?.info || {};
}

export async function getInfo(ticker) {
  const sym = ticker.trim().toUpperCase();
  const infoMap = await getInfos([sym]);
  const info = infoMap[sym];

  if (!info) throw new Error("No info returned");

  return {
    ticker: sym,
    price: info.regularMarketPrice ?? info.currentPrice ?? null,
    name: info.shortName ?? info.longName ?? sym,
    sector: info.sector ?? "N/A",
    industry: info.industry ?? "N/A",
    beta: info.beta ?? null,
  };
}