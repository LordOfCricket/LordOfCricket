import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTeamProfile } from '../../hooks/useTeamProfile.js'
import { useAuth } from '../../hooks/useAuth.js'
import { StatsLoadingGrid, StatsErrorState } from '../../components/stats/StatsStates.jsx'
import TeamHero from '../../components/teams/TeamHero.jsx'
import TeamRecordTiles from '../../components/teams/TeamRecordTiles.jsx'
import TeamRecentForm from '../../components/teams/TeamRecentForm.jsx'
import TeamSquadList from '../../components/teams/TeamSquadList.jsx'
import TeamSquadManager from '../../components/teams/TeamSquadManager.jsx'
import TeamTopPerformers from '../../components/teams/TeamTopPerformers.jsx'
import TeamMatchSection from '../../components/teams/TeamMatchSection.jsx'
import MatchCard from '../../components/matches/MatchCard.jsx'

function SectionHeading({ children }) {
  return <h2 className="text-lg font-bold text-white">{children}</h2>
}

export default function TeamProfilePage() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, loading, error, retry } = useTeamProfile(teamId)

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <StatsLoadingGrid tiles={4} />
        </div>
      </main>
    )
  }

  if (error || !profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center text-white">
        <StatsErrorState message={error} onRetry={retry} />
        <button type="button" onClick={() => navigate('/teams')} className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
          Back to Teams
        </button>
      </main>
    )
  }

  const { team, squad, record, recentForm, liveMatch, upcomingFixtures, recentMatches, topPerformers } = profile

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 py-8 text-white sm:px-6 lg:px-8"
      style={{ backgroundImage: `linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.85)), url('/images/cricket-stadium.jpg')` }}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-medium text-emerald-100/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <TeamHero team={team} squadCount={squad.length} />

        <div>
          <SectionHeading>Official Record</SectionHeading>
          <div className="mt-3">
            <TeamRecordTiles record={record} />
          </div>
        </div>

        <div>
          <SectionHeading>Recent Form</SectionHeading>
          <div className="mt-3">
            <TeamRecentForm recentForm={recentForm} />
          </div>
        </div>

        {liveMatch && (
          <div>
            <SectionHeading>Live Match</SectionHeading>
            <div className="mt-3">
              <MatchCard match={liveMatch} />
            </div>
          </div>
        )}

        <TeamMatchSection title="Upcoming Fixtures" matches={upcomingFixtures} emptyMessage="No upcoming fixtures scheduled." />
        <TeamMatchSection title="Recent Matches" matches={recentMatches} emptyMessage="No completed matches yet." />

        <div>
          <SectionHeading>Current Squad</SectionHeading>
          <div className="mt-3">
            <TeamSquadList squad={squad} />
          </div>
        </div>

        {user?.role === 'staff' && (
          <div>
            <SectionHeading>Roster Management</SectionHeading>
            <div className="mt-3">
              <TeamSquadManager team={team} squad={squad} onChange={retry} />
            </div>
          </div>
        )}

        <div>
          <SectionHeading>Top Performers</SectionHeading>
          <div className="mt-3">
            <TeamTopPerformers topPerformers={topPerformers} />
          </div>
        </div>
      </div>
    </main>
  )
}
