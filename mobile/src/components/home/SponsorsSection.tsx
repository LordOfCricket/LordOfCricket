import React from 'react'
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native'
import { usePartners } from '../../hooks/usePartners'
import { Colors, Spacing, Typography } from '../../constants/colors'

export function SponsorsSection({ title = 'Our Network' }: { title?: string }) {
  const { data: partners, isLoading, isError } = usePartners()

  if (isError) return null

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.inlineLoader} />
      ) : !partners || partners.length === 0 ? (
        <View style={styles.emptyStateSmall}>
          <Text style={styles.emptySubtext}>No partners yet</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {partners.map((partner) => (
            <View key={partner.id} style={styles.card}>
              <Image source={{ uri: partner.logo_url }} style={styles.logo} resizeMode="contain" />
              <Text style={styles.name} numberOfLines={1}>
                {partner.name}
              </Text>
            </View>
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
  },
  hScroll: {
    gap: Spacing.lg,
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
    width: 90,
  },
  logo: {
    width: 64,
    height: 64,
  },
  name: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
})
