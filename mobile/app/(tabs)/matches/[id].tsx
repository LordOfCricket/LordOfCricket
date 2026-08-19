import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMatchDetail } from '../../../src/hooks/useMatches'
import { Colors, Spacing, Typography } from '../../../src/constants/colors'
import { LoadingScreen } from '../../../src/components/LoadingScreen'
import { ErrorScreen } from '../../../src/components/ErrorScreen'

export default function MatchDetailsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const matchId = parseInt(id || '0', 10)
  const [refreshing, setRefreshing] = useState(false)

  const { data: match, isLoading, isError, error, refetch } = useMatchDetail(matchId)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (!id) {
    return (
      <ErrorScreen
        title="Error"
        message="Match ID is required"
        onRetry={() => router.back()}
        retryLabel="Go Back"
      />
    )
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isError) {
    return (
      <ErrorScreen
        title="Failed to Load"
        message="Could not load match details. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  if (!match) {
    return (
      <ErrorScreen
        title="Not Found"
        message="This match could not be found."
        onRetry={() => router.back()}
        retryLabel="Go Back"
      />
    )
  }

  const matchDate = new Date(match.match?.match_date)
  const dateStr = matchDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const getStatusColor = () => {
    const status = match.match?.status
    switch (status) {
      case 'live':
        return Colors.statusOngoing
      case 'upcoming':
        return Colors.statusUpcoming
      case 'completed':
        return Colors.statusCompleted
      case 'cancelled':
        return Colors.statusCancelled
      default:
        return Colors.textTertiary
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: getStatusColor(),
            },
          ]}
        >
          <Text style={styles.statusText}>{match.match?.status?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Match Info */}
      <View style={styles.card}>
        <Text style={styles.dateText}>{dateStr}</Text>
        {match.match?.venue && <Text style={styles.venueText}>{match.match.venue}</Text>}
      </View>

      {/* Teams */}
      <View style={styles.card}>
        <View style={styles.teamContainer}>
          <View style={styles.team}>
            <Text style={styles.teamName}>{match.teamA?.name || 'Team A'}</Text>
            {match.match?.team_a_runs !== null && (
              <Text style={styles.score}>
                {match.match?.team_a_runs || 0}/{match.match?.team_a_wickets || 0}
              </Text>
            )}
            {match.match?.team_a_overs && (
              <Text style={styles.overs}>{match.match.team_a_overs} overs</Text>
            )}
          </View>

          <Text style={styles.vs}>vs</Text>

          <View style={styles.team}>
            <Text style={styles.teamName}>{match.teamB?.name || 'Team B'}</Text>
            {match.match?.team_b_runs !== null && (
              <Text style={styles.score}>
                {match.match?.team_b_runs || 0}/{match.match?.team_b_wickets || 0}
              </Text>
            )}
            {match.match?.team_b_overs && (
              <Text style={styles.overs}>{match.match.team_b_overs} overs</Text>
            )}
          </View>
        </View>
      </View>

      {/* Result/Toss Info */}
      {match.match?.result && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Result</Text>
          <Text style={styles.resultText}>{match.match.result}</Text>
        </View>
      )}

      {match.match?.toss_winner_id && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Toss Winner</Text>
          <Text style={styles.infoText}>
            {match.tossWinner?.name ||
              (match.match.toss_winner_id === match.match.team_a_id
                ? match.teamA?.name
                : match.teamB?.name)}
          </Text>
        </View>
      )}

      {/* Innings Details */}
      {match.innings && match.innings.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Innings</Text>
          {match.innings.map((innings: any, idx: number) => (
            <View key={innings.id} style={styles.inningsDetail}>
              <Text style={styles.inningsLabel}>Innings {idx + 1}</Text>
              <Text style={styles.inningsStats}>
                {innings.runs}/{innings.wickets} in {innings.overs} overs
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Commentary */}
      {match.commentary && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Commentary</Text>
          <Text style={styles.commentaryText}>{match.commentary}</Text>
        </View>
      )}
    </ScrollView>
  )
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 4,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
  },
  dateText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  venueText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  teamContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  team: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  score: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  overs: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  vs: {
    fontSize: Typography.fontSize.base,
    color: Colors.textTertiary,
    marginHorizontal: Spacing.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  resultText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    lineHeight: 20,
  },
  infoText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
  inningsDetail: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inningsLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  inningsStats: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  commentaryText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    lineHeight: 20,
  },
})
