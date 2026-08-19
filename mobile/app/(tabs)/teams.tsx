import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useDiscoverTeams } from '../../src/hooks/useTeams'
import { Colors, Spacing, Typography } from '../../src/constants/colors'
import { LoadingScreen } from '../../src/components/LoadingScreen'
import { ErrorScreen } from '../../src/components/ErrorScreen'
import { EmptyState } from '../../src/components/EmptyState'

export default function TeamsScreen() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, isError, error, refetch } = useDiscoverTeams(searchQuery || undefined, 50, 0)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleTeamPress = (teamId: number) => {
    router.push(`/(tabs)/teams/${teamId}`)
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isError) {
    return (
      <ErrorScreen
        title="Failed to Load"
        message="Could not load teams. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  const teams = data?.teams || []

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Teams</Text>
        <Text style={styles.subtitle}>Browse cricket teams</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search teams..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Teams List */}
      {teams.length > 0 ? (
        <FlatList
          data={teams}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.teamCard}
              onPress={() => handleTeamPress(item.id)}
            >
              {item.logo_url && (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoText}>🏏</Text>
                </View>
              )}
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{item.name}</Text>
                <Text style={styles.teamShortName}>{item.short_name}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => `${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListEmptyComponent={
            <EmptyState
              title="No teams found"
              message={searchQuery ? `No teams match "${searchQuery}"` : 'No teams available'}
            />
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}
    </View>
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
  title: {
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    backgroundColor: Colors.backgroundAlt,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  logoText: {
    fontSize: 24,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  teamShortName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  arrow: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textTertiary,
  },
})
