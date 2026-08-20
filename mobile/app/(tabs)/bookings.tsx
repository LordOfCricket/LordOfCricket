import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import { useMyBookings } from '../src/hooks/useBooking'
import { Colors, Spacing, Typography } from '../src/constants/colors'
import { LoadingScreen } from '../src/components/LoadingScreen'
import { ErrorScreen } from '../src/components/ErrorScreen'
import { EmptyState } from '../src/components/EmptyState'
import { Booking } from '../src/types'

export default function BookingsScreen() {
  const router = useRouter()
  const { data: bookings = [], isLoading, isError, error, refetch } = useMyBookings()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleNewBooking = () => {
    router.push('/(tabs)/bookings/new')
  }

  const handleViewBooking = (publicBookingId: string) => {
    router.push(`/(tabs)/bookings/${publicBookingId}`)
  }

  const isUpcoming = (booking: Booking) => {
    return new Date(booking.startTime) > new Date() && booking.status === 'CONFIRMED'
  }

  const isPast = (booking: Booking) => {
    return new Date(booking.endTime) <= new Date()
  }

  const upcomingBookings = bookings.filter(isUpcoming)
  const pastBookings = bookings.filter(isPast)
  const cancelledBookings = bookings.filter((b: Booking) => b.status === 'CANCELLED')

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isError) {
    return (
      <ErrorScreen
        title="Failed to Load Bookings"
        message={error?.message || 'Unable to fetch your bookings'}
        onRetry={() => refetch()}
      />
    )
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon="📅"
        title="No Bookings Yet"
        message="Book a ground for your next cricket match"
        actionLabel="Book Now"
        onAction={handleNewBooking}
      />
    )
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <TouchableOpacity style={styles.newBookingBtn} onPress={handleNewBooking}>
          <Text style={styles.newBookingText}>+ New Booking</Text>
        </TouchableOpacity>
      </View>

      {upcomingBookings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          {upcomingBookings.map((booking: Booking) => (
            <BookingCard
              key={booking.publicBookingId}
              booking={booking}
              onPress={() => handleViewBooking(booking.publicBookingId)}
              isExpanded={expandedId === booking.publicBookingId}
              onToggleExpand={() =>
                setExpandedId(expandedId === booking.publicBookingId ? null : booking.publicBookingId)
              }
            />
          ))}
        </View>
      )}

      {pastBookings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed</Text>
          {pastBookings.map((booking: Booking) => (
            <BookingCard
              key={booking.publicBookingId}
              booking={booking}
              onPress={() => handleViewBooking(booking.publicBookingId)}
              isExpanded={expandedId === booking.publicBookingId}
              onToggleExpand={() =>
                setExpandedId(expandedId === booking.publicBookingId ? null : booking.publicBookingId)
              }
            />
          ))}
        </View>
      )}

      {cancelledBookings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cancelled</Text>
          {cancelledBookings.map((booking: Booking) => (
            <BookingCard
              key={booking.publicBookingId}
              booking={booking}
              onPress={() => handleViewBooking(booking.publicBookingId)}
              isExpanded={expandedId === booking.publicBookingId}
              onToggleExpand={() =>
                setExpandedId(expandedId === booking.publicBookingId ? null : booking.publicBookingId)
              }
            />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

interface BookingCardProps {
  booking: Booking
  onPress: () => void
  isExpanded: boolean
  onToggleExpand: () => void
}

function BookingCard({ booking, onPress, isExpanded, onToggleExpand }: BookingCardProps) {
  const startDate = new Date(booking.startTime)
  const endDate = new Date(booking.endTime)

  const dateStr = startDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const timeStr = `${startDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`

  const statusColor =
    booking.status === 'CONFIRMED' ? Colors.success :
    booking.status === 'CANCELLED' ? Colors.danger :
    Colors.warning

  return (
    <TouchableOpacity
      style={[styles.bookingCard, { borderLeftColor: statusColor, borderLeftWidth: 4 }]}
      onPress={onPress}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingDate}>{dateStr}</Text>
          <Text style={styles.bookingTime}>{timeStr}</Text>
          {booking.purpose && <Text style={styles.bookingPurpose}>{booking.purpose}</Text>}
        </View>
        <Text style={[styles.bookingStatus, { color: statusColor }]}>{booking.displayStatus}</Text>
      </View>

      {booking.expectedPlayers && (
        <Text style={styles.bookingDetail}>👥 {booking.expectedPlayers} players</Text>
      )}

      {booking.contactPhone && (
        <Text style={styles.bookingDetail}>📞 {booking.contactPhone}</Text>
      )}

      {isExpanded && booking.notes && (
        <Text style={styles.bookingNotes}>{booking.notes}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.title,
    color: Colors.text,
  },
  newBookingBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  newBookingText: {
    ...Typography.body2,
    color: Colors.white,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.body1,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingDate: {
    ...Typography.body1,
    fontWeight: 'bold',
    color: Colors.text,
  },
  bookingTime: {
    ...Typography.body2,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  bookingPurpose: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  bookingStatus: {
    ...Typography.body2,
    fontWeight: 'bold',
  },
  bookingDetail: {
    ...Typography.body2,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  bookingNotes: {
    ...Typography.body2,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
})
