import StatTile from './StatTile.jsx'

function formatHighest(highestScore) {
  if (!highestScore) return null
  return `${highestScore.runs}${highestScore.notOut ? '*' : ''}`
}

export default function BattingStatsPanel({ matches, batting }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Matches" value={matches} />
        <StatTile label="Innings" value={batting.innings} />
        <StatTile label="Not Outs" value={batting.notOuts} />
        <StatTile label="Runs" value={batting.runs} emphasis />
        <StatTile label="Balls Faced" value={batting.ballsFaced} />
        <StatTile label="Highest" value={formatHighest(batting.highestScore)} emphasis />
        <StatTile label="Average" value={batting.average} />
        <StatTile label="Strike Rate" value={batting.strikeRate} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="4s" value={batting.fours} />
        <StatTile label="6s" value={batting.sixes} />
        <StatTile label="30s" value={batting.thirties} />
        <StatTile label="50s" value={batting.fifties} />
        <StatTile label="100s" value={batting.hundreds} />
        <StatTile label="Ducks" value={batting.ducks} />
      </div>
    </div>
  )
}
