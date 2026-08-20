import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native"
import { useRouter } from "expo-router"
import { useMyPlayer, useMyPlayerStats } from "../../src/hooks/usePlayer"
import { useAuth } from "../../src/hooks/useAuth"
import { usePhotoUpload } from "../../src/hooks/usePhotoUpload"
import { Colors, Spacing, Typography } from "../../src/constants/colors"
import { LoadingScreen } from "../../src/components/LoadingScreen"
import { ErrorScreen } from "../../src/components/ErrorScreen"
import { EmptyState } from "../../src/components/EmptyState"
import { PhotoPreviewModal } from "../../src/components/PhotoPreviewModal"
import {
  formatRole,
  formatBattingStyle,
  formatBowlingStyle,
  formatDate,
  calculateAge,
  formatStatValue,
} from "../../src/utils/playerFormatting"

interface StatItem {
  label: string
  value: string
}

interface SectionData {
  title: string
  data: StatItem[]
}

export default function ProfileScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  const playerQuery = useMyPlayer(user?.role === "player")
  const statsQuery = useMyPlayerStats(10, 0, user?.role === "player")

  const photoUpload = usePhotoUpload()

  const handlePhotoTap = () => {
    Alert.alert(
      "Change Profile Photo",
      undefined,
      [
        {
          text: "Take Photo",
          onPress: photoUpload.launchCamera,
        },
        {
          text: "Choose from Gallery",
          onPress: photoUpload.launchGallery,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    )
  }

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([playerQuery.refetch(), statsQuery.refetch()])
    } finally {
      setRefreshing(false)
    }
  }, [playerQuery, statsQuery])

  // Handle loading states
  if (user?.role === "player" && playerQuery.isPending) {
    return <LoadingScreen />
  }

  // Handle error states
  if (user?.role === "player" && playerQuery.error) {
    return (
      <ErrorScreen
        title="Failed to Load Profile"
        message="Could not load your player profile. Please try again."
        onRetry={() => playerQuery.refetch()}
        retryLabel="Retry"
      />
    )
  }

  const player = playerQuery.data

  // Sections data for statistics
  const sections: SectionData[] = []
  
  if (statsQuery.data?.career) {
    const career = statsQuery.data.career
    
    // Batting stats
    if (career.batting) {
      const battingStats: StatItem[] = [
        { label: "Matches", value: formatStatValue(career.batting.innings) },
        { label: "Runs", value: formatStatValue(career.batting.runs) },
        { label: "Average", value: formatStatValue(career.batting.average) },
        { label: "Strike Rate", value: formatStatValue(career.batting.strikeRate) },
        { label: "Fours", value: formatStatValue(career.batting.fours) },
        { label: "Sixes", value: formatStatValue(career.batting.sixes) },
      ]
      sections.push({ title: "Batting", data: battingStats })
    }

    // Bowling stats
    if (career.bowling) {
      const bowlingStats: StatItem[] = [
        { label: "Matches", value: formatStatValue(career.bowling.innings) },
        { label: "Wickets", value: formatStatValue(career.bowling.wickets) },
        { label: "Average", value: formatStatValue(career.bowling.average) },
        { label: "Economy", value: formatStatValue(career.bowling.economy) },
        { label: "Overs", value: formatStatValue(career.bowling.equivalentOvers) },
      ]
      sections.push({ title: "Bowling", data: bowlingStats })
    }

    // Fielding stats
    if (career.fielding) {
      const fieldingStats: StatItem[] = [
        { label: "Catches", value: formatStatValue(career.fielding.catches) },
        { label: "Stumpings", value: formatStatValue(career.fielding.stumpings) },
      ]
      sections.push({ title: "Fielding", data: fieldingStats })
    }
  }

  const profileContent = (
    <>
      {/* Profile Header */}
      {player && (
        <View style={styles.headerSection}>
          {/* Photo or Avatar */}
          <TouchableOpacity
            style={styles.photoContainer}
            onPress={handlePhotoTap}
            disabled={photoUpload.isLoading}
            accessible={true}
            accessibilityLabel="Change profile photo"
            accessibilityRole="button"
          >
            {player.photo_url ? (
              <Image
                source={{ uri: player.photo_url }}
                style={styles.photo}
                onError={() => {
                  /* Handle image error gracefully */
                }}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {player.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </Text>
              </View>
            )}
            <View style={styles.photoEditBadge}>
              <Text style={styles.photoEditIcon}>📷</Text>
            </View>
          </TouchableOpacity>

          {/* Name and Nickname */}
          <Text style={styles.playerName}>{player.name}</Text>
          {player.nickname && (
            <Text style={styles.nickname}>@{player.nickname}</Text>
          )}

          {/* Role Badge */}
          {player.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{formatRole(player.role)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Cricket Profile Section */}
      {player && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cricket Profile</Text>
          <View style={styles.card}>
            {player.role && (
              <InfoRow label="Role" value={formatRole(player.role) || ''} />
            )}
            {player.batting_style && (
              <InfoRow
                label="Batting"
                value={formatBattingStyle(player.batting_style) || ''}
              />
            )}
            {player.bowling_style && (
              <InfoRow
                label="Bowling"
                value={formatBowlingStyle(player.bowling_style) || ''}
              />
            )}
            {player.jersey_number !== null && player.jersey_number !== undefined && (
              <InfoRow label="Jersey" value={`#${player.jersey_number}`} />
            )}
            {player.is_wicket_keeper && (
              <InfoRow label="Position" value="Wicket Keeper" />
            )}
          </View>
        </View>
      )}

      {/* Personal Information Section */}
      {player && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            {player.date_of_birth && (
              <InfoRow
                label="Date of Birth"
                value={`${formatDate(player.date_of_birth)} (${calculateAge(player.date_of_birth)} years)`}
              />
            )}
            {player.city && <InfoRow label="City" value={player.city} />}
            {player.state && <InfoRow label="State" value={player.state} />}
            {player.address_line && (
              <InfoRow label="Address" value={player.address_line} />
            )}
            {player.postal_code && (
              <InfoRow label="Postal Code" value={player.postal_code} />
            )}
            {player.bio && <InfoRow label="Bio" value={player.bio} />}
          </View>
        </View>
      )}

      {/* Career Statistics Section */}
      {sections.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Career Statistics</Text>
          {sections.map((section, idx) => (
            <View key={idx} style={styles.card}>
              <Text style={styles.subsectionTitle}>{section.title}</Text>
              {section.data.map((item, itemIdx) => (
                <StatRow
                  key={itemIdx}
                  label={item.label}
                  value={item.value}
                  isLast={itemIdx === section.data.length - 1}
                />
              ))}
            </View>
          ))}
        </View>
      )}

      {/* No Stats Message */}
      {statsQuery.data && sections.length === 0 && (
        <View style={styles.section}>
          <EmptyState
            title="No Statistics Yet"
            message="You haven't played any matches yet. Statistics will appear here after your first match."
          />
        </View>
      )}

      {/* Stats Loading */}
      {statsQuery.isPending && sections.length === 0 && (
        <View style={[styles.section, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {/* Stats Error */}
      {statsQuery.error && (
        <View style={styles.section}>
          <ErrorScreen
            title="Statistics Unavailable"
            message="Could not load your statistics. Try refreshing."
            onRetry={() => statsQuery.refetch()}
            retryLabel="Retry"
          />
        </View>
      )}

      {/* Match History Entry Point */}
      {statsQuery.data?.career?.matches !== undefined && statsQuery.data.career.matches > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.matchHistoryButton}
            onPress={() => router.push('/profile/matches')}
            accessible={true}
            accessibilityLabel="View player match history"
            accessibilityRole="button"
          >
            <View style={styles.matchHistoryContent}>
              <Text style={styles.matchHistoryLabel}>Match History</Text>
              <Text style={styles.matchHistoryCount}>
                {statsQuery.data.career.matches} matches
              </Text>
            </View>
            <Text style={styles.matchHistoryArrow}>→</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  )

  return (
    <SafeAreaView style={styles.container}>
      {user?.role === "player" ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {profileContent}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollView}>
          <View style={styles.centerContainer}>
            <EmptyState
              title="Player Profile"
              message="You need to select a player role to view your player profile."
            />
          </View>
        </ScrollView>
      )}

      <PhotoPreviewModal
        visible={photoUpload.showPreview}
        imageUri={photoUpload.selectedImageUri}
        onUpload={photoUpload.handleUpload}
        onCancel={photoUpload.closePreview}
        onChooseAnother={photoUpload.retryImageSelection}
      />
    </SafeAreaView>
  )
}

/**
 * Component to display a row of information
 */
function InfoRow({
  label,
  value,
  isLast = false,
}: {
  label: string
  value: string
  isLast?: boolean
}) {
  return (
    <View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {!isLast && <View style={styles.divider} />}
    </View>
  )
}

/**
 * Component to display a statistic row
 */
function StatRow({
  label,
  value,
  isLast = false,
}: {
  label: string
  value: string
  isLast?: boolean
}) {
  return (
    <View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      {!isLast && <View style={styles.divider} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: Spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  headerSection: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  photoContainer: {
    marginBottom: Spacing.md,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.gray[100],
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  photoEditIcon: {
    fontSize: 20,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  playerName: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  nickname: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  roleBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.sm,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  subsectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  infoValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
    textAlign: "right",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  statValue: {
    fontSize: Typography.fontSize.lg,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  bottomSpacer: {
    height: Spacing.lg,
  },
  matchHistoryButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
  },
  matchHistoryContent: {
    flex: 1,
  },
  matchHistoryLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  matchHistoryCount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  matchHistoryArrow: {
    fontSize: Typography.fontSize.lg,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
    marginLeft: Spacing.md,
  },
})
