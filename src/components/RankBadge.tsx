import { getRankForMiles, getNextRank, getRankProgressPercent, getMilesUntilNextRank } from "../lib/ranks";

interface Props {
  totalMiles: number;
}

export default function RankBadge({ totalMiles }: Props) {
  const rank = getRankForMiles(totalMiles);
  const pct = getRankProgressPercent(totalMiles);
  const milesLeft = getMilesUntilNextRank(totalMiles);
  const next = getNextRank(rank);

  return (
    <div className="bg-stone-800 border border-roman-gold/40 rounded-xl p-5 text-center">
      <div className="text-5xl mb-2">{rank.icon}</div>
      <div className="text-roman-gold font-bold text-xl tracking-widest uppercase font-serif">
        {rank.name}
      </div>
      <div className="text-stone-400 text-sm mt-1">
        {totalMiles.toFixed(2)} miles completed
      </div>

      {next && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-stone-400 mb-1">
            <span>{rank.name}</span>
            <span>{next.name}</span>
          </div>
          <div className="w-full bg-stone-700 rounded-full h-2.5">
            <div
              className="bg-roman-gold h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-stone-400 text-xs mt-1.5">
            {milesLeft} miles until {next.icon} {next.name}
          </div>
        </div>
      )}

      {!next && (
        <div className="mt-3 text-roman-gold/70 text-sm italic">
          Maximum rank achieved — Ave Caesar! ⚡
        </div>
      )}
    </div>
  );
}
