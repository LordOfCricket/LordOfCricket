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
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { useHomeFeed } from '../../src/hooks/useMatches'
import { Colors, Spacing, Typography } from '../../src/constants/colors'
import { LoadingScreen } from '../../src/components/LoadingScreen'
import { ErrorScreen } from '../../src/components/ErrorScreen'
import { MatchCard } from '../../src/components/MatchCard'

export default function HomeScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { data: homeFeed, isLoading, isError, error, refetch } = useHomeFeed()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const navigateToMatches = () => {
    router.push('/(tabs)/matches')
  }

  const navigateToTeams = () => {
    router.push('/(tabs)/teams')
  }

  const navigateToGrounds = () => {
    router.push('/(tabs)/grounds')
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isError) {
    return (
      <ErrorScreen
        title="Failed to Load"
        message="Could not load home feed. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  const liveMatches = homeFeed?.live || []
  const upcomingMatches = homeFeed?.upcoming || []
  const recentMatches = homeFeed?.recent || []

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {user?.name || 'Cricket Lover'}!</Text>
        <Text style={styles.subtitle}>Your cricket hub</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={navigateToMatches}>
            <Text style={styles.actionLabel}>Matches</Text>
            <Text style={styles.actionIcon}>🏏</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={navigateToTeams}>
            <Text style={styles.actionLabel}>Teams</Text>
            <Text style={styles.actionIcon}>👥</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={navigateToGrounds}>
            <Text style={styles.actionLabel}>Grounds</Text>
            <Text style={styles.actionIcon}>🌍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Matches */}
      {liveMatches && liveMatches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔴 Live Matches</Text>
            {liveMatches.length > 3 && (
              <TouchableOpacity onPress={navigateToMatches}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            )}
          </View>
          {liveMatches.slice(0, 3).map((match: any) => (
            <MatchCard
              key={match.id}
              match={match}
              teamAName={homeFeed?.teamMap?.[match.team_a_id]?.name || 'Team A'}
              teamBName={homeFeed?.teamMap?.[match.team_b_id]?.name || 'Team B'}
            />
          ))}
        </View>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches && upcomingMatches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📅 Upcoming Matches</Text>
            {upcomingMatches.length > 3 && (
              <TouchableOpacity onPress={navigateToMatches}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            )}
          </View>
          {upcomingMatches.slice(0, 3).map((match: any) => (
            <MatchCard
              key={match.id}
              match={match}
              teamAName={homeFeed?.teamMap?.[match.team_a_id]?.name || 'Team A'}
              teamBName={homeFeed?.teamMap?.[match.team_b_id]?.name || 'Team B'}
            />
          ))}
        </View>
      )}

      {/* Recent Results */}
      {recentMatches && recentMatches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 Recent Results</Text>
            {recentMatches.length > 3 && (
              <TouchableOpacity onPress={navigateToMatches}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentMatches.slice(0, 3).map((match: any) => (
            <MatchCard
              key={match.id}
              match={match}
              teamAName={homeFeed?.teamMap?.[match.team_a_id]?.name || 'Team A'}
              teamBName={homeFeed?.teamMap?.[match.team_b_id]?.name || 'Team B'}
            />
          ))}
        </View>
      )}

      {/* Empty state */}
      {(!liveMatches || liveMatches.length === 0) &&
        (!upcomingMatches || upcomingMatches.length === 0) &&
        (!recentMatches || recentMatches.length === 0) && (
          <View style={styles.section}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No matches yet</Text>
              <Text style={styles.emptySubtext}>Check back soon for upcoming matches</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={navigateToMatches}>
                <Text style={styles.primaryButtonText}>Browse Matches</Text>
              </TouchableOpacity>
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
    padding: Spacing.lg,
    paddingTop: Spacing['3xl'],
    backgroundColor: Colors.primary,
  },
  greeting: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
    opacity: 0.9,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  viewAllText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  emptyState: {
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptySubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.base,
  },
})
