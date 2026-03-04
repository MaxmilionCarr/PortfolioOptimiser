import { api } from "./client";

const mapModel = (type) => (type === "historical" ? "historical_average" : "capm");

export async function optimize({ type, tickers, date, maxWeight, maxRisk }) {
  const res = await api.post("/optimize", {
    tickers,
    model: mapModel(type),
    date,
    max_weight: maxWeight,
    max_risk: maxRisk,
  });
  return res.data;
}