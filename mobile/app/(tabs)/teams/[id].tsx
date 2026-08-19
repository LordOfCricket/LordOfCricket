import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTeamDetail, useTeamPlayers } from '../../../src/hooks/useTeams'
import { Colors, Spacing, Typography } from '../../../src/constants/colors'
import { LoadingScreen } from '../../../src/components/LoadingScreen'
import { ErrorScreen } from '../../../src/components/ErrorScreen'

export default function TeamDetailsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const teamId = parseInt(id || '0', 10)
  const [refreshing, setRefreshing] = useState(false)

  const { data: team, isLoading: teamLoading, isError: teamError, refetch: refetchTeam } = useTeamDetail(teamId)
  const { data: playersData, refetch: refetchPlayers } = useTeamPlayers(teamId)

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchTeam(), refetchPlayers()])
    setRefreshing(false)
  }

  if (!id) {
    return (
      <ErrorScreen
        title="Error"
        message="Team ID is required"
        onRetry={() => router.back()}
        retryLabel="Go Back"
      />
    )
  }

  if (teamLoading) {
    return <LoadingScreen />
  }

  if (teamError) {
    return (
      <ErrorScreen
        title="Failed to Load"
        message="Could not load team details. Please try again."
        onRetry={() => refetchTeam()}
      />
    )
  }

  if (!team) {
    return (
      <ErrorScreen
        title="Not Found"
        message="This team could not be found."
        onRetry={() => router.back()}
        retryLabel="Go Back"
      />
    )
  }

  const players = playersData?.players || []

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      </View>

      {/* Team Header */}
      <View style={styles.teamHeader}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🏏</Text>
        </View>
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{team.name || team.squad?.[0]?.teamName || 'Team'}</Text>
          <Text style={styles.shortName}>{team.short_name || team.teamShortName}</Text>
        </View>
      </View>

      {/* Team Stats if available */}
      {team.record && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Record</Text>
          <View style={styles.statsGrid}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{team.record.wins || 0}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{team.record.losses || 0}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{team.record.draws || 0}</Text>
              <Text style={styles.statLabel}>Draws</Text>
            </View>
          </View>
        </View>
      )}

      {/* Squad/Players */}
      {players.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Squad ({players.length})</Text>
          {players.map((player: any) => (
            <View key={player.id} style={styles.playerRow}>
              <View>
                <Text style={styles.playerName}>{player.name}</Text>
                {player.role && <Text style={styles.playerRole}>{player.role}</Text>}
              </View>
              {player.jersey_number && (
                <Text style={styles.jerseyNumber}>#{player.jersey_number}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Recent Matches if available */}
      {team.recent_form && team.recent_form.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Form</Text>
          <View style={styles.formContainer}>
            {team.recent_form.map((result: any, idx: number) => (
              <View
                key={idx}
                style={[
                  styles.formResult,
                  {
                    backgroundColor:
                      result === 'W'
                        ? Colors.success
                        : result === 'L'
                          ? Colors.error
                          : Colors.gray[400],
                  },
                ]}
              >
                <Text style={styles.formResultText}>{result}</Text>
              </View>
            ))}
          </View>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  logoText: {
    fontSize: 32,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  shortName: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  playerName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  playerRole: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  jerseyNumber: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  formContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  formResult: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formResultText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
})
