import type { RomanRank } from "../types";

export const ROMAN_RANKS: RomanRank[] = [
  { name: "Recruit",    minMiles: 0,    maxMiles: 4.9,  icon: "🛡️" },
  { name: "Legionary",  minMiles: 5,    maxMiles: 14.9, icon: "⚔️" },
  { name: "Optio",      minMiles: 15,   maxMiles: 29.9, icon: "🏹" },
  { name: "Centurion",  minMiles: 30,   maxMiles: 49.9, icon: "🦅" },
  { name: "Legate",     minMiles: 50,   maxMiles: 99.9, icon: "👑" },
  { name: "Caesar",     minMiles: 100,  maxMiles: null, icon: "⚡" },
];

export function getRankForMiles(totalMiles: number): RomanRank {
  for (let i = ROMAN_RANKS.length - 1; i >= 0; i--) {
    if (totalMiles >= ROMAN_RANKS[i].minMiles) {
      return ROMAN_RANKS[i];
    }
  }
  return ROMAN_RANKS[0];
}

export function getNextRank(currentRank: RomanRank): RomanRank | null {
  const idx = ROMAN_RANKS.findIndex((r) => r.name === currentRank.name);
  return idx < ROMAN_RANKS.length - 1 ? ROMAN_RANKS[idx + 1] : null;
}

export function getMilesUntilNextRank(totalMiles: number): number | null {
  const next = getNextRank(getRankForMiles(totalMiles));
  if (!next) return null;
  return parseFloat((next.minMiles - totalMiles).toFixed(2));
}

export function getRankProgressPercent(totalMiles: number): number {
  const current = getRankForMiles(totalMiles);
  const next = getNextRank(current);
  if (!next) return 100;
  const range = next.minMiles - current.minMiles;
  const progress = totalMiles - current.minMiles;
  return Math.min(100, Math.round((progress / range) * 100));
}
