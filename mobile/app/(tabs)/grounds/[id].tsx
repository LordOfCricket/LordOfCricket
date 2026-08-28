import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useGroundDetail, useGroundAvailability } from '../../../src/hooks/useGrounds'
import { Colors, Spacing, Typography } from '../../../src/constants/colors'
import { LoadingScreen } from '../../../src/components/LoadingScreen'
import { ErrorScreen } from '../../../src/components/ErrorScreen'
import { groundTodayDateStr } from '../../../src/utils/groundTime'

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function GroundDetailsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [refreshing, setRefreshing] = useState(false)

  const today = groundTodayDateStr()
  const { data: ground, isLoading, isError, error, refetch: refetchGround } = useGroundDetail(id || '')
  const {
    data: availability,
    isLoading: isAvailabilityLoading,
    isError: isAvailabilityError,
    refetch: refetchAvailability,
  } = useGroundAvailability(today, id)

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchGround(), refetchAvailability()])
    setRefreshing(false)
  }

  if (!id) {
    return (
      <ErrorScreen
        title="Error"
        message="Ground ID is required"
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
        message="Could not load ground details. Please try again."
        onRetry={() => refetchGround()}
      />
    )
  }

  if (!ground) {
    return (
      <ErrorScreen
        title="Not Found"
        message="This ground could not be found."
        onRetry={() => router.back()}
        retryLabel="Go Back"
      />
    )
  }

  const slots = availability?.slots || []

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      </View>

      {/* Ground Info */}
      {ground.primaryPhoto && (
        <Image source={{ uri: ground.primaryPhoto }} style={styles.groundImage} />
      )}
      <View style={styles.card}>
        <Text style={styles.groundName}>{ground.name}</Text>
        {ground.city && <Text style={styles.location}>📍 {ground.city}</Text>}
        {ground.addressLine && <Text style={styles.address}>{ground.addressLine}</Text>}
        {ground.state && <Text style={styles.state}>{ground.state}</Text>}
      </View>

      {/* Today's Availability */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Availability</Text>

        {isAvailabilityLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.inlineLoader} />
        ) : isAvailabilityError ? (
          <View style={styles.availabilityErrorRow}>
            <Text style={styles.availabilityErrorText}>Could not load availability.</Text>
            <TouchableOpacity onPress={() => refetchAvailability()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : slots.length === 0 ? (
          <Text style={styles.emptySubtext}>No slots available for today.</Text>
        ) : (
          <View style={styles.slotsList}>
            {slots.map((slot: any, idx: number) => {
              const isAvailable = slot.status === 'AVAILABLE'
              return (
                <View
                  key={idx}
                  style={[styles.slotRow, isAvailable ? styles.slotRowAvailable : styles.slotRowUnavailable]}
                >
                  <Text style={styles.slotRowTime}>
                    {formatSlotTime(slot.startTime)} - {formatSlotTime(slot.endTime)}
                  </Text>
                  <Text
                    style={[
                      styles.slotRowStatus,
                      isAvailable ? styles.slotRowStatusAvailable : styles.slotRowStatusUnavailable,
                    ]}
                  >
                    {isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
                  </Text>
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/bookings/new',
              params: { publicGroundId: id, groundName: ground.name },
            } as any)
          }
        >
          <Text style={styles.bookButtonText}>Book a Slot</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.proposalsButton}
          onPress={() => router.push(`/(tabs)/grounds/${id}/proposals`)}
          accessibilityLabel="View open proposals"
        >
          <Text style={styles.proposalsButtonText}>View Proposals</Text>
        </TouchableOpacity>
      </View>
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
  groundImage: {
    width: '100%',
    height: 200,
    marginBottom: Spacing.md,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
  },
  groundName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  location: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    marginBottom: Spacing.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  address: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  state: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  inlineLoader: {
    marginVertical: Spacing.md,
  },
  availabilityErrorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityErrorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.error,
    flex: 1,
  },
  retryText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptySubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  slotsList: {
    gap: Spacing.sm,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  slotRowAvailable: {
    backgroundColor: Colors.success,
    opacity: 0.15,
    borderColor: Colors.success,
  },
  slotRowUnavailable: {
    backgroundColor: Colors.gray[100],
    borderColor: Colors.gray[300],
  },
  slotRowTime: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
  },
  slotRowStatus: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  slotRowStatusAvailable: {
    color: Colors.statusOngoing,
  },
  slotRowStatusUnavailable: {
    color: Colors.textTertiary,
  },
  actionSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  bookButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  proposalsButton: {
    backgroundColor: Colors.backgroundAlt,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  proposalsButtonText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
})
