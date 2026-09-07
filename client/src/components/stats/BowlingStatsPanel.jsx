import StatTile from './StatTile.jsx'

function formatBest(bestBowling) {
  if (!bestBowling) return null
  return `${bestBowling.wickets}/${bestBowling.runs}`
}

export default function BowlingStatsPanel({ bowling }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Innings" value={bowling.innings} />
        <StatTile label="Wickets" value={bowling.wickets} emphasis />
        {/* Career workload spans matches that may use different balls-per-over,
            so it's shown as an exact legal-ball count rather than
            an "overs" string that would silently assume six-ball overs. */}
        <StatTile label="Legal Balls" value={bowling.legalBalls} />
        <StatTile label="Maidens" value={bowling.maidens} />
        <StatTile label="Runs Conceded" value={bowling.runsConceded} />
        <StatTile label="Best" value={formatBest(bowling.bestBowling)} emphasis />
        <StatTile label="Average" value={bowling.average} />
        <StatTile label="Economy" value={bowling.economy} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Strike Rate" value={bowling.strikeRate} />
        <StatTile label="3W" value={bowling.threeWicketHauls} />
        <StatTile label="4W" value={bowling.fourWicketHauls} />
        <StatTile label="5W" value={bowling.fiveWicketHauls} />
      </div>
    </div>
  )
}
