import { useEffect, useState } from 'react'
import { useHomeDiscovery } from '../../hooks/useHomeDiscovery.js'
import ScrollReveal from '../common/ScrollReveal.jsx'
import { fadeUpSoft } from '../../lib/revealVariants.js'

function FixtureCard({ match }) {
  const matchDate = new Date(match.createdAt || new Date())
  const timeStr = match.scheduledStartTime || 'TBD'

  return (
    <ScrollReveal variant={fadeUpSoft} amount={0.3} className="rounded-xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#064B38]/30 to-transparent p-6 hover:border-[#D4AF37]/40 transition-all">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Teams */}
        <div className="flex flex-col items-center justify-center gap-2 lg:col-span-1">
          <p className="text-sm font-semibold text-[#F5F7F5]">{match.homeTeam?.name || 'Team A'}</p>
          <p className="text-xs text-[#B5C2BC]">vs</p>
          <p className="text-sm font-semibold text-[#F5F7F5]">{match.awayTeam?.name || 'Team B'}</p>
        </div>

        {/* Match Details */}
        <div className="flex flex-col justify-center gap-2 text-center lg:col-span-1">
          <p className="text-xs uppercase tracking-widest text-[#D4AF37]">{match.format || 'T20'}</p>
          <p className="text-sm text-[#B5C2BC]">{timeStr}</p>
        </div>

        {/* Venue */}
        <div className="flex flex-col justify-center gap-2 text-right lg:col-span-1">
          <p className="text-xs uppercase tracking-widest text-[#D4AF37]">Venue</p>
          <p className="text-sm text-[#B5C2BC]">{match.ground?.name || 'TBD'}</p>
        </div>
      </div>
    </ScrollReveal>
  )
}

export default function UpcomingFixtures({ groundId }) {
  const { matches, loading, error } = useHomeDiscovery()
  const [todayFixtures, setTodayFixtures] = useState([])
  const [tomorrowFixtures, setTomorrowFixtures] = useState([])

  useEffect(() => {
    if (!matches || matches.length === 0) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999)

    const today_fixtures = matches.filter((m) => {
      const matchDate = new Date(m.createdAt || new Date())
      return matchDate >= today && matchDate <= todayEnd && m.status === 'scheduled'
    })

    const tomorrow_fixtures = matches.filter((m) => {
      const matchDate = new Date(m.createdAt || new Date())
      return matchDate >= tomorrow && matchDate <= tomorrowEnd && m.status === 'scheduled'
    })

    setTodayFixtures(today_fixtures)
    setTomorrowFixtures(tomorrow_fixtures)
  }, [matches])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-dashed border-red-400/30 bg-red-400/5 p-6 text-center">
        <p className="text-sm text-red-300/70">Unable to load fixtures</p>
      </div>
    )
  }

  const hasFixtures = todayFixtures.length > 0 || tomorrowFixtures.length > 0

  if (!hasFixtures) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D4AF37]/20 bg-[#064B38]/10 p-12 text-center">
        <p className="text-[#B5C2BC]">No upcoming fixtures scheduled for today or tomorrow</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Today's Fixtures */}
      {todayFixtures.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#D4AF37] uppercase tracking-widest">Today</h3>
          <div className="space-y-3">
            {todayFixtures.map((match) => (
              <FixtureCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      )}

      {/* Tomorrow's Fixtures */}
      {tomorrowFixtures.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#D4AF37] uppercase tracking-widest">Tomorrow</h3>
          <div className="space-y-3">
            {tomorrowFixtures.map((match) => (
              <FixtureCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
