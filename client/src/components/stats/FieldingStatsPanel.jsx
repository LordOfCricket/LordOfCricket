import StatTile from './StatTile.jsx'

export default function FieldingStatsPanel({ fielding }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatTile label="Catches" value={fielding.catches} emphasis />
      <StatTile label="Run Outs" value={fielding.runOuts} />
      <StatTile label="Stumpings" value={fielding.stumpings} />
    </div>
  )
}
