import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { useFeaturedGrounds } from '../../hooks/useGrounds'
import { Colors, Spacing, Typography } from '../../constants/colors'

export function FeaturedGroundsSection() {
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useFeaturedGrounds(8)
  const grounds = data?.grounds || []

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Grounds</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/grounds')}>
          <Text style={styles.viewAllText}>View all</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.inlineLoader} />
      ) : isError ? (
        <TouchableOpacity style={styles.emptyStateSmall} onPress={() => refetch()}>
          <Text style={styles.emptySubtext}>Couldn't load grounds. Tap to retry.</Text>
        </TouchableOpacity>
      ) : grounds.length === 0 ? (
        <View style={styles.emptyStateSmall}>
          <Text style={styles.emptySubtext}>No registered grounds yet</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.hScrollContainer}
          contentContainerStyle={styles.hScroll}
        >
          {grounds.map((ground) => (
            <TouchableOpacity
              key={ground.publicGroundId}
              style={styles.groundCard}
              onPress={() => router.push(`/(tabs)/grounds/${ground.publicGroundId}` as any)}
            >
              {ground.primaryPhoto ? (
                <Image source={{ uri: ground.primaryPhoto }} style={styles.groundImage} />
              ) : (
                <View style={[styles.groundImage, styles.groundImagePlaceholder]} />
              )}
              <Text style={styles.groundName} numberOfLines={1}>
                {ground.name}
              </Text>
              {(ground.city || ground.state) && (
                <Text style={styles.groundLocation} numberOfLines={1}>
                  {[ground.city, ground.state].filter(Boolean).join(', ')}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
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
  inlineLoader: {
    marginVertical: Spacing.lg,
  },
  emptyStateSmall: {
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  hScrollContainer: {
    flexGrow: 0,
  },
  hScroll: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  groundCard: {
    width: 160,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 12,
    overflow: 'hidden',
  },
  groundImage: {
    width: '100%',
    height: 100,
  },
  groundImagePlaceholder: {
    backgroundColor: Colors.gray[200],
  },
  groundName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.sm,
  },
  groundLocation: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.sm,
  },
})
