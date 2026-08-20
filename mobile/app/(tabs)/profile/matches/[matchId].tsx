import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMyPlayerStats } from '../../../../src/hooks/usePlayer'
import { useAuth } from '../../../../src/hooks/useAuth'
import { Colors, Spacing, Typography } from '../../../../src/constants/colors'
import { LoadingScreen } from '../../../../src/components/LoadingScreen'
import { ErrorScreen } from '../../../../src/components/ErrorScreen'
import { EmptyState } from '../../../../src/components/EmptyState'

export default function MatchDetailScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { matchId } = useLocalSearchParams<{ matchId: string }>()

  // Fetch all player stats to find the requested match
  const statsQuery = useMyPlayerStats(50, 0, user?.role === 'player')

  if (!user || user.role !== 'player') {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          title="Player Profile Required"
          message="You need a player role to view match details."
        />
      </SafeAreaView>
    )
  }

  if (!matchId) {
    return (
      <ErrorScreen
        title="Invalid Match"
        message="Match ID is missing. Please try again."
        onRetry={() => router.back()}
        retryLabel="Back"
      />
    )
  }

  if (statsQuery.isPending) {
    return <LoadingScreen />
  }

  if (statsQuery.error) {
    return (
      <ErrorScreen
        title="Failed to Load Match"
        message="Could not load match details."
        onRetry={() => statsQuery.refetch()}
        retryLabel="Retry"
      />
    )
  }

  const matchIdNum = parseInt(matchId, 10)
  const match = statsQuery.data?.matchHistory?.items?.find((m) => m.matchId === matchIdNum)

  if (!match) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Match Details</Text>
          <View style={{ width: 50 }} />
        </View>
        <EmptyState
          title="Match Not Found"
          message="Unable to find this match in your match history."
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Match Performance</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Match Header */}
        <View style={styles.matchHeader}>
          <Text style={styles.date}>{formatDate(match.date)}</Text>
          <Text style={styles.venue}>{match.venue || 'Venue unavailable'}</Text>

          <View style={styles.matchupRow}>
            <Text style={styles.opponent}>vs {match.opponent || 'Unknown'}</Text>
          </View>

          {match.result && <Text style={styles.matchResult}>{match.result}</Text>}

          {match.won !== null && (
            <View style={[styles.resultBadge, { backgroundColor: getResultColor(match.won) }]}>
              <Text style={styles.resultText}>{match.won ? 'Won' : 'Lost'}</Text>
            </View>
          )}
        </View>

        {/* Batting Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BATTING</Text>
          <View style={styles.card}>
            {match.batting?.didBat ? (
              <>
                <StatRow label="Runs" value={match.batting.runs?.toString() || '-'} highlight />
                <StatRow label="Balls" value={match.batting.balls?.toString() || '-'} />
                <StatRow label="Fours" value={match.batting.fours?.toString() || '-'} />
                <StatRow label="Sixes" value={match.batting.sixes?.toString() || '-'} />
                <StatRow
                  label="Strike Rate"
                  value={match.batting.strikeRate ? match.batting.strikeRate.toFixed(2) : '-'}
                />
              </>
            ) : (
              <Text style={styles.didNotParticipateText}>Did not bat</Text>
            )}
          </View>
        </View>

        {/* Bowling Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BOWLING</Text>
          <View style={styles.card}>
            {match.bowling?.didBowl ? (
              <>
                <StatRow label="Wickets" value={match.bowling.wickets?.toString() || '-'} highlight />
                <StatRow label="Runs" value={match.bowling.runs?.toString() || '-'} />
                <StatRow
                  label="Overs"
                  value={match.bowling.legalBalls ? formatOvers(match.bowling.legalBalls) : '-'}
                />
                <StatRow label="Maidens" value={match.bowling.maidens?.toString() || '-'} />
                <StatRow
                  label="Economy"
                  value={match.bowling.economy ? match.bowling.economy.toFixed(2) : '-'}
                />
              </>
            ) : (
              <Text style={styles.didNotParticipateText}>Did not bowl</Text>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

function StatRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  )
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

function formatOvers(legalBalls: number): string {
  const overs = Math.floor(legalBalls / 6)
  const balls = legalBalls % 6
  return `${overs}.${balls}`
}

function getResultColor(won: boolean): string {
  return won ? '#00D084' : '#FF3B30'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 50,
  },
  backButtonText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.base,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  matchHeader: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  date: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.sm,
  },
  venue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  matchupRow: {
    marginBottom: Spacing.md,
  },
  opponent: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  matchResult: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  resultBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 4,
  },
  resultText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.base,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  statValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: Typography.fontWeight.semibold,
  },
  statValueHighlight: {
    fontSize: Typography.fontSize.lg,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  didNotParticipateText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    padding: Spacing.md,
  },
  bottomSpacer: {
    height: Spacing.lg,
  },
})
