import { metas } from "./meta.js";

export function ranking() {
  return Object.entries(metas)
    .map(([id, m]) => ({
      id,
      total: m.kevlar + m.ferro
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}
