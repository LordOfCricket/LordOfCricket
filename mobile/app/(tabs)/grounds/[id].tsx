import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useGroundDetail, useGroundAvailability } from '../../../src/hooks/useGrounds'
import { Colors, Spacing, Typography } from '../../../src/constants/colors'
import { LoadingScreen } from '../../../src/components/LoadingScreen'
import { ErrorScreen } from '../../../src/components/ErrorScreen'

export default function GroundDetailsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [refreshing, setRefreshing] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const { data: ground, isLoading, isError, error, refetch: refetchGround } = useGroundDetail(id || '')
  const { data: availability, refetch: refetchAvailability } = useGroundAvailability(today)

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

  const availableSlots = availability?.slots?.filter((s: any) => s.status === 'AVAILABLE').length || 0

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

      {/* Ground Info */}
      <View style={styles.card}>
        <Text style={styles.groundName}>{ground.name}</Text>
        {ground.city && <Text style={styles.location}>📍 {ground.city}</Text>}
        {ground.address_line && <Text style={styles.address}>{ground.address_line}</Text>}
        {ground.state && <Text style={styles.state}>{ground.state}</Text>}
      </View>

      {/* Availability Summary */}
      {availability && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Availability</Text>
          <View style={styles.availabilityContainer}>
            <View style={styles.availabilityItem}>
              <Text style={styles.availabilityNumber}>{availableSlots}</Text>
              <Text style={styles.availabilityLabel}>Available Slots</Text>
            </View>
            <View style={styles.availabilityItem}>
              <Text style={styles.availabilityNumber}>{availability.slots?.length || 0}</Text>
              <Text style={styles.availabilityLabel}>Total Slots</Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        {availableSlots > 0 && (
          <TouchableOpacity style={styles.bookButton}>
            <Text style={styles.bookButtonText}>Book a Slot</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.proposalsButton}
          onPress={() => router.push(`/(tabs)/grounds/${id}/proposals`)}
          accessibilityLabel="View open proposals"
        >
          <Text style={styles.proposalsButtonText}>View Proposals</Text>
        </TouchableOpacity>
      </View>

      {/* Slot Grid */}
      {availability && availability.slots && availability.slots.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Available Time Slots</Text>
          <View style={styles.slotsGrid}>
            {availability.slots.map((slot: any, idx: number) => (
              <View
                key={idx}
                style={[
                  styles.slot,
                  slot.status === 'AVAILABLE' ? styles.slotAvailable : styles.slotUnavailable,
                ]}
              >
                <Text
                  style={[
                    styles.slotTime,
                    slot.status === 'AVAILABLE' ? styles.slotTimeAvailable : styles.slotTimeUnavailable,
                  ]}
                >
                  {slot.time}
                </Text>
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
  availabilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  availabilityItem: {
    alignItems: 'center',
  },
  availabilityNumber: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  availabilityLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  slot: {
    width: '30%',
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  slotAvailable: {
    backgroundColor: Colors.success,
    opacity: 0.2,
    borderColor: Colors.success,
  },
  slotUnavailable: {
    backgroundColor: Colors.gray[300],
    opacity: 0.3,
    borderColor: Colors.gray[400],
  },
  slotTime: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  slotTimeAvailable: {
    color: Colors.statusOngoing,
  },
  slotTimeUnavailable: {
    color: Colors.textTertiary,
  },
})
