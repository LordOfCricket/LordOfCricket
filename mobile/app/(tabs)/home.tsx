import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useAuthStore } from '../../src/store/authStore'
import { useMyPlayer } from '../../src/hooks/usePlayer'
import { useTeamMatches } from '../../src/hooks/useTeams'
import { useFeaturedGrounds } from '../../src/hooks/useGrounds'
import { useMyAvailability, useSetMyAvailability } from '../../src/hooks/useMatchAvailability'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../src/constants/colors'
import { MatchCard } from '../../src/components/MatchCard'
import { HallOfFameSection } from '../../src/components/home/HallOfFameSection'
import { SponsorsSection } from '../../src/components/home/SponsorsSection'
import { getErrorMessage } from '../../src/utils/errors'
import { Match } from '../../src/types'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const isPlayer = user?.role === 'player'
  const playerQuery = useMyPlayer(isPlayer)
  const teamId = playerQuery.data?.team_id ?? null
  const teamMatchesQuery = useTeamMatches(teamId as number)

  // Real, already-available platform-scale metric — same GET /grounds
  // endpoint FeaturedGroundsSection uses; limit=1 keeps the payload small
  // since only pagination.total is needed here.
  const groundsCountQuery = useFeaturedGrounds(1)
  const trustedGroundsCount = groundsCountQuery.data?.pagination.total ?? null

  const nextMatch = useMemo<Match | null>(() => {
    const matches: Match[] = teamMatchesQuery.data || []
    const upcoming = matches
      .filter((m) => m.status === 'upcoming' && (m.teamA.id === teamId || m.teamB.id === teamId))
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
    return upcoming[0] || null
  }, [teamMatchesQuery.data, teamId])

  const availabilityQuery = useMyAvailability(nextMatch?.id ?? null)
  const setAvailability = useSetMyAvailability(nextMatch?.id ?? null)

  const handleRsvp = async (status: 'AVAILABLE' | 'NOT_AVAILABLE') => {
    try {
      await setAvailability.mutateAsync(status)
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err))
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([teamMatchesQuery.refetch(), groundsCountQuery.refetch()])
    setRefreshing(false)
  }

  const navigateToGrounds = () => {
    router.push('/(tabs)/grounds')
  }

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {/* Branding */}
        <View style={[styles.brandBlock, { paddingTop: insets.top + Spacing.lg }]}>
          <Text style={styles.brandName}>LORD OF CRICKET</Text>
          <Text style={styles.brandTagline}>Your Cricket. Your Legacy.</Text>
        </View>

        {/* Personalized Welcome */}
        <View style={styles.welcomeBlock}>
          <Text style={styles.welcomeText}>
            {getGreeting()}, {user?.name || 'Cricket Lover'} 👋
          </Text>
        </View>

        {/* Next Match / Availability (personalized — kept from the existing Home) */}
        {isPlayer && teamId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Match</Text>
            {teamMatchesQuery.isLoading ? (
              <ActivityIndicator color={Colors.primary} style={styles.inlineLoader} />
            ) : nextMatch ? (
              <>
                <MatchCard match={nextMatch} />
                <View style={styles.rsvpRow}>
                  <Text style={styles.rsvpLabel}>Your Availability</Text>
                  <View style={styles.rsvpButtons}>
                    <TouchableOpacity
                      style={[
                        styles.rsvpButton,
                        availabilityQuery.data?.status === 'AVAILABLE' && styles.rsvpButtonAvailableActive,
                      ]}
                      disabled={setAvailability.isPending}
                      onPress={() => handleRsvp('AVAILABLE')}
                      accessibilityRole="button"
                      accessibilityLabel="Mark yourself available for the next match"
                    >
                      <Text
                        style={[
                          styles.rsvpButtonText,
                          availabilityQuery.data?.status === 'AVAILABLE' && styles.rsvpButtonTextActive,
                        ]}
                      >
                        Available
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.rsvpButton,
                        availabilityQuery.data?.status === 'NOT_AVAILABLE' && styles.rsvpButtonUnavailableActive,
                      ]}
                      disabled={setAvailability.isPending}
                      onPress={() => handleRsvp('NOT_AVAILABLE')}
                      accessibilityRole="button"
                      accessibilityLabel="Mark yourself not available for the next match"
                    >
                      <Text
                        style={[
                          styles.rsvpButtonText,
                          availabilityQuery.data?.status === 'NOT_AVAILABLE' && styles.rsvpButtonTextActive,
                        ]}
                      >
                        Not Available
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyStateSmall}>
                <Text style={styles.emptySubtext}>No upcoming match scheduled for your team</Text>
              </View>
            )}
          </View>
        )}

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroHeadline}>Every Game Has a Story.{'\n'}Make Yours Count.</Text>
          <Text style={styles.heroSubtext}>
            Play. Compete. Perform. Build your cricketing legacy with Lord Of Cricket.
          </Text>
          <TouchableOpacity
            style={styles.heroButton}
            onPress={navigateToGrounds}
            accessibilityRole="button"
            accessibilityLabel="Find a ground"
          >
            <Text style={styles.heroButtonText}>Find a Ground</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More Than Just a Cricket Ground</Text>
          <Text style={styles.aboutText}>
            Lord Of Cricket brings players, teams, grounds, matches and cricketing communities together in one
            place.
          </Text>
        </View>

        {/* Platform Scale / Trust */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cricket, Wherever You Play.</Text>
          {groundsCountQuery.isLoading ? (
            <ActivityIndicator color={Colors.primary} style={styles.inlineLoader} />
          ) : trustedGroundsCount !== null ? (
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{trustedGroundsCount}</Text>
              <Text style={styles.statLabel}>Trusted Grounds</Text>
            </View>
          ) : null}
        </View>

        {/* Rankings entry — the public leaderboards live on their own
            screen (hidden route); Home and the Players directory are the
            two entry points. */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.rankingsCta}
            onPress={() => router.push('/(tabs)/rankings' as any)}
            accessibilityRole="button"
            accessibilityLabel="Open player rankings"
          >
            <MaterialCommunityIcons name="trophy-outline" size={22} color={Colors.primary} />
            <View style={styles.rankingsCtaText}>
              <Text style={styles.rankingsCtaTitle}>Player Rankings</Text>
              <Text style={styles.rankingsCtaSub}>Official leaderboards from finalized matches</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Tournaments entry — public tournament hub (hidden route); reached
            from Home and the Matches tab. */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.rankingsCta}
            onPress={() => router.push('/(tabs)/tournaments' as any)}
            accessibilityRole="button"
            accessibilityLabel="Browse tournaments"
          >
            <MaterialCommunityIcons name="tournament" size={22} color={Colors.primary} />
            <View style={styles.rankingsCtaText}>
              <Text style={styles.rankingsCtaTitle}>Tournaments</Text>
              <Text style={styles.rankingsCtaSub}>Live, upcoming and completed competitions</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Hall of Fame */}
        <HallOfFameSection title="The Ones Who Made Their Mark" />

        {/* Sponsors */}
        <SponsorsSection title="Proudly Supported By" />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  brandBlock: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  brandName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  welcomeBlock: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  welcomeText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  inlineLoader: {
    marginVertical: Spacing.md,
  },
  emptyStateSmall: {
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingsCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundAlt,
  },
  rankingsCtaText: {
    flex: 1,
  },
  rankingsCtaTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  rankingsCtaSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptySubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  rsvpRow: {
    marginTop: Spacing.sm,
  },
  rsvpLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rsvpButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
  },
  rsvpButtonAvailableActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  rsvpButtonUnavailableActive: {
    borderColor: Colors.error,
    backgroundColor: Colors.error,
  },
  rsvpButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  rsvpButtonTextActive: {
    color: Colors.white,
  },
  hero: {
    margin: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary,
    // RN New Architecture (Expo 57) supports CSS-style boxShadow directly.
    boxShadow: Shadows.lg,
  },
  heroHeadline: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    lineHeight: Typography.fontSize['2xl'] * Typography.lineHeight.tight,
    marginBottom: Spacing.md,
  },
  heroSubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
    opacity: 0.9,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
    marginBottom: Spacing.lg,
  },
  heroButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  heroButtonText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  aboutText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
  },
  statTile: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
})
