import React from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useHallOfFame } from '../../hooks/useHallOfFame'
import { Colors, Spacing, Typography } from '../../constants/colors'
import { formatRole } from '../../utils/playerFormatting'

export function HallOfFameSection({ title = 'Hall of Fame' }: { title?: string }) {
  const router = useRouter()
  const { data: categories, isLoading, isError } = useHallOfFame()
  const awarded = (categories || []).filter((c) => c.player)

  if (isError) return null

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.inlineLoader} />
      ) : awarded.length === 0 ? (
        <View style={styles.emptyStateSmall}>
          <Text style={styles.emptySubtext}>Not yet awarded — check back once more matches are played</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {awarded.map((category) => (
            <TouchableOpacity
              key={category.key}
              style={styles.card}
              onPress={() => router.push(`/(tabs)/players/${category.player!.publicPlayerId}` as any)}
              accessibilityRole="button"
              accessibilityLabel={`View ${category.player!.name}'s player profile`}
            >
              <Text style={styles.categoryLabel}>{category.label}</Text>
              <Text style={styles.playerName} numberOfLines={1}>
                {category.player!.name}
              </Text>
              <Text style={styles.playerRole} numberOfLines={1}>
                {formatRole(category.player!.role) || 'Playing role not set'}
              </Text>
              <Text style={styles.headline}>{category.player!.headline}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
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
    marginVertical: Spacing.lg,
  },
  emptyStateSmall: {
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  hScroll: {
    gap: Spacing.md,
  },
  card: {
    width: 150,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 12,
    padding: Spacing.md,
  },
  categoryLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  playerName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  playerRole: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headline: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.secondary,
    marginTop: Spacing.sm,
  },
})
