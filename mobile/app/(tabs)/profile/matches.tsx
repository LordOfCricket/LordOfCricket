import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useMyPlayerStats } from '../../../src/hooks/usePlayer'
import { useAuth } from '../../../src/hooks/useAuth'
import { Colors, Spacing, Typography } from '../../../src/constants/colors'
import { LoadingScreen } from '../../../src/components/LoadingScreen'
import { ErrorScreen } from '../../../src/components/ErrorScreen'
import { EmptyState } from '../../../src/components/EmptyState'

const PAGE_SIZE = 10

export default function MatchHistoryScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [offset, setOffset] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [allMatches, setAllMatches] = useState<any[]>([])

  const handleMatchTap = useCallback((matchId: number) => {
    router.push(`/profile/matches/${matchId}`)
  }, [router])

  const statsQuery = useMyPlayerStats(PAGE_SIZE, offset, user?.role === 'player')

  React.useEffect(() => {
    if (statsQuery.data?.matchHistory?.items) {
      if (offset === 0) {
        setAllMatches(statsQuery.data.matchHistory.items)
      } else {
        setAllMatches((prev) => [...prev, ...statsQuery.data.matchHistory.items])
      }
    }
  }, [statsQuery.data?.matchHistory?.items, offset])

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    setOffset(0)
    setAllMatches([])
    try {
      await statsQuery.refetch()
    } finally {
      setRefreshing(false)
    }
  }, [statsQuery])

  const handleLoadMore = React.useCallback(() => {
    if (
      statsQuery.data?.matchHistory &&
      allMatches.length < statsQuery.data.matchHistory.total &&
      !statsQuery.isPending
    ) {
      setOffset((prev) => prev + PAGE_SIZE)
    }
  }, [statsQuery.data, allMatches.length, statsQuery.isPending])

  if (!user || user.role !== 'player') {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          title="Player Profile Required"
          message="You need a player role to view match history."
        />
      </SafeAreaView>
    )
  }

  if (offset === 0 && statsQuery.isPending) {
    return <LoadingScreen />
  }

  if (offset === 0 && statsQuery.error) {
    return (
      <ErrorScreen
        title="Failed to Load Matches"
        message="Could not load your match history."
        onRetry={() => statsQuery.refetch()}
        retryLabel="Retry"
      />
    )
  }

  const total = statsQuery.data?.matchHistory?.total || 0
  const showLoadMore = allMatches.length < total && !statsQuery.isPending

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Match History</Text>
        <View style={{ width: 50 }} />
      </View>

      {allMatches.length === 0 && !statsQuery.isPending ? (
        <EmptyState
          title="No Matches"
          message="Your match performances will appear here after you play."
        />
      ) : (
        <FlatList
          data={allMatches}
          keyExtractor={(item) => `${item.matchId}`}
          renderItem={({ item }) => <MatchCard match={item} onPress={() => handleMatchTap(item.matchId)} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
          ListFooterComponent={
            <>
              {statsQuery.isPending && allMatches.length > 0 && (
                <View style={styles.loadingFooter}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              )}
              {showLoadMore && (
                <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                  <Text style={styles.loadMoreText}>Load More Matches</Text>
                </TouchableOpacity>
              )}
            </>
          }
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
        />
      )}
    </SafeAreaView>
  )
}

function MatchCard({ match, onPress }: any) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDate(match.date)}</Text>
        <View style={[styles.resultBadge, { backgroundColor: getResultColor(match.won) }]}>
          <Text style={styles.resultText}>{getResultLabel(match.won)}</Text>
        </View>
      </View>

      <Text style={styles.venue}>{match.venue || 'Venue unavailable'}</Text>
      <Text style={styles.opponent}>vs {match.opponent || 'Opponent unavailable'}</Text>

      {match.result && <Text style={styles.matchResult}>{match.result}</Text>}

      <View style={styles.statsContainer}>
        {match.batting?.didBat && (
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Batting</Text>
            <Text style={styles.statValue}>
              {match.batting.runs} ({match.batting.balls})
            </Text>
            <Text style={styles.statDetail}>
              {match.batting.fours}•4 {match.batting.sixes}•6 SR:{' '}
              {match.batting.strikeRate?.toFixed(2) || '-'}
            </Text>
          </View>
        )}

        {match.bowling?.didBowl && (
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Bowling</Text>
            <Text style={styles.statValue}>
              {match.bowling.wickets} / {match.bowling.runs}
            </Text>
            <Text style={styles.statDetail}>
              {formatOvers(match.bowling.legalBalls)} Eco: {match.bowling.economy?.toFixed(2) || '-'}
            </Text>
          </View>
        )}

        {!match.batting?.didBat && !match.bowling?.didBowl && (
          <Text style={styles.dnbText}>Did not participate</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateString
  }
}

function formatOvers(legalBalls: number | undefined): string {
  if (!legalBalls) return '-'
  const overs = Math.floor(legalBalls / 6)
  const balls = legalBalls % 6
  return `${overs}.${balls}`
}

function getResultColor(won: boolean | null): string {
  if (won === true) return '#00D084'
  if (won === false) return '#FF3B30'
  return Colors.gray[400]
}

function getResultLabel(won: boolean | null): string {
  if (won === true) return 'Won'
  if (won === false) return 'Lost'
  return 'Result'
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
  card: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  date: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  resultBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultText: {
    color: Colors.white,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  venue: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
  },
  opponent: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  matchResult: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  statsContainer: {
    marginTop: Spacing.md,
  },
  statBlock: {
    marginBottom: Spacing.sm,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  statValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  statDetail: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  dnbText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  loadingFooter: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  loadMoreButton: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadMoreText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.base,
  },
})
