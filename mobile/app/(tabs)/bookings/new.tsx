import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput as RNTextInput,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import { useAvailability, useCreateBooking } from '../../src/hooks/useBooking'
import { Colors, Spacing, Typography } from '../../src/constants/colors'
import { LoadingScreen } from '../../src/components/LoadingScreen'
import { ErrorScreen } from '../../src/components/ErrorScreen'

type Step = 'date' | 'slot' | 'details' | 'confirm'

export default function NewBookingScreen() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('date')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null)
  const [notes, setNotes] = useState('')
  const [expectedPlayers, setExpectedPlayers] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const { data: availability, isLoading: isLoadingAvailability, isError: isAvailabilityError } =
    useAvailability(selectedDate ? selectedDate.toISOString().slice(0, 10) : null, step !== 'date')

  const createBooking = useCreateBooking()

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false)
    if (date) {
      // Prevent selecting past dates (compare dates only, not time)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const selectedDateOnly = new Date(date)
      selectedDateOnly.setHours(0, 0, 0, 0)

      if (selectedDateOnly < today) {
        Alert.alert('Invalid Date', 'Please select a future date')
        return
      }
      setSelectedDate(date)
      setStep('slot')
    }
  }

  const handleSlotSelect = (slot: any) => {
    setSelectedSlot(slot)
    setStep('details')
  }

  const handleConfirm = async () => {
    if (!selectedDate || !selectedSlot) {
      Alert.alert('Missing Information', 'Please complete all steps')
      return
    }

    try {
      await createBooking.mutateAsync({
        startTime: selectedSlot.startTime,
        expectedPlayers: expectedPlayers ? parseInt(expectedPlayers, 10) : undefined,
        contactPhone: contactPhone || undefined,
        notes: notes || undefined,
      })

      Alert.alert('Success', 'Booking confirmed!', [
        {
          text: 'View Bookings',
          onPress: () => {
            router.push('/(tabs)/bookings')
          },
        },
      ])
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error.message || 'Booking failed'
      Alert.alert('Booking Failed', errorMsg)
    }
  }

  return (
    <View style={styles.container}>
      {step === 'date' && (
        <DateSelectionStep
          selectedDate={selectedDate}
          onShowPicker={() => setShowDatePicker(true)}
          showPicker={showDatePicker}
          onDateChange={handleDateChange}
        />
      )}

      {step === 'slot' && (
        <SlotSelectionStep
          date={selectedDate!}
          availability={availability}
          isLoading={isLoadingAvailability}
          isError={isAvailabilityError}
          selectedSlot={selectedSlot}
          onSlotSelect={handleSlotSelect}
          onBack={() => setStep('date')}
        />
      )}

      {step === 'details' && (
        <BookingDetailsStep
          notes={notes}
          onNotesChange={setNotes}
          expectedPlayers={expectedPlayers}
          onPlayersChange={setExpectedPlayers}
          contactPhone={contactPhone}
          onPhoneChange={setContactPhone}
          onBack={() => setStep('slot')}
          onNext={() => setStep('confirm')}
        />
      )}

      {step === 'confirm' && (
        <BookingConfirmStep
          selectedDate={selectedDate!}
          selectedSlot={selectedSlot!}
          notes={notes}
          expectedPlayers={expectedPlayers}
          contactPhone={contactPhone}
          isSubmitting={createBooking.isPending}
          onBack={() => setStep('details')}
          onConfirm={handleConfirm}
        />
      )}
    </View>
  )
}

function DateSelectionStep({
  selectedDate,
  onShowPicker,
  showPicker,
  onDateChange,
}: {
  selectedDate: Date | null
  onShowPicker: () => void
  showPicker: boolean
  onDateChange: (event: any, date?: Date) => void
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Select Date</Text>
      <Text style={styles.stepDescription}>Choose a date within the next 30 days</Text>

      <TouchableOpacity style={styles.dateButton} onPress={onShowPicker}>
        <Text style={styles.dateButtonText}>
          {selectedDate
            ? selectedDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : 'Tap to select date'}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedDate || today}
          mode="date"
          display="spinner"
          onChange={onDateChange}
          minimumDate={today}
          maximumDate={new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)}
        />
      )}

      {selectedDate && (
        <TouchableOpacity style={styles.nextButton} onPress={() => {}}>
          <Text style={styles.nextButtonText}>Continue</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

function SlotSelectionStep({
  date,
  availability,
  isLoading,
  isError,
  selectedSlot,
  onSlotSelect,
  onBack,
}: {
  date: Date
  availability: any
  isLoading: boolean
  isError: boolean
  selectedSlot: any
  onSlotSelect: (slot: any) => void
  onBack: () => void
}) {
  if (isLoading) {
    return (
      <View style={styles.stepContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading available slots...</Text>
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.errorText}>Failed to load availability</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onBack}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const slots = availability?.slots || []
  const availableSlots = slots.filter((s: any) => s.status === 'AVAILABLE')

  if (availableSlots.length === 0) {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.errorText}>No available slots on this date</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onBack}>
          <Text style={styles.retryButtonText}>Choose Different Date</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Select Time Slot</Text>
      <Text style={styles.stepDescription}>
        {date.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
      </Text>

      <View style={styles.slotsContainer}>
        {availableSlots.map((slot: any) => {
          const startTime = new Date(slot.startTime)
          const endTime = new Date(slot.endTime)
          const isSelected = selectedSlot?.startTime === slot.startTime

          return (
            <TouchableOpacity
              key={`${slot.startTime}-${slot.endTime}`}
              style={[
                styles.slotButton,
                isSelected && styles.slotButtonSelected,
              ]}
              onPress={() => onSlotSelect(slot)}
            >
              <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                {startTime.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {endTime.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !selectedSlot && styles.buttonDisabled]}
          onPress={() => selectedSlot && onSlotSelect(selectedSlot)}
          disabled={!selectedSlot}
        >
          <Text style={styles.nextButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

function BookingDetailsStep({
  notes,
  onNotesChange,
  expectedPlayers,
  onPlayersChange,
  contactPhone,
  onPhoneChange,
  onBack,
  onNext,
}: {
  notes: string
  onNotesChange: (text: string) => void
  expectedPlayers: string
  onPlayersChange: (text: string) => void
  contactPhone: string
  onPhoneChange: (text: string) => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Booking Details</Text>
      <Text style={styles.stepDescription}>Add optional information</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Number of Players (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 11"
          keyboardType="numeric"
          value={expectedPlayers}
          onChangeText={onPlayersChange}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contact Phone (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Your phone number"
          keyboardType="phone-pad"
          value={contactPhone}
          onChangeText={onPhoneChange}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Any additional information"
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={onNotesChange}
        />
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextButtonText}>Review & Confirm</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

function BookingConfirmStep({
  selectedDate,
  selectedSlot,
  notes,
  expectedPlayers,
  contactPhone,
  isSubmitting,
  onBack,
  onConfirm,
}: {
  selectedDate: Date
  selectedSlot: any
  notes: string
  expectedPlayers: string
  contactPhone: string
  isSubmitting: boolean
  onBack: () => void
  onConfirm: () => void
}) {
  const startTime = new Date(selectedSlot.startTime)
  const endTime = new Date(selectedSlot.endTime)

  return (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Confirm Booking</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text style={styles.summaryValue}>
            {selectedDate.toLocaleDateString('en-IN', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Time</Text>
          <Text style={styles.summaryValue}>
            {startTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            -{' '}
            {endTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {expectedPlayers && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Players</Text>
            <Text style={styles.summaryValue}>{expectedPlayers}</Text>
          </View>
        )}

        {contactPhone && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phone</Text>
            <Text style={styles.summaryValue}>{contactPhone}</Text>
          </View>
        )}

        {notes && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Notes</Text>
            <Text style={styles.summaryValue}>{notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={isSubmitting}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmButton, isSubmitting && styles.buttonDisabled]}
          onPress={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

// Re-export TextInput
const TextInput = RNTextInput

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stepContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  stepTitle: {
    ...Typography.title,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  stepDescription: {
    ...Typography.body2,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  dateButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: Spacing.lg,
  },
  dateButtonText: {
    ...Typography.body1,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  loadingText: {
    ...Typography.body2,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.body1,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  retryButtonText: {
    ...Typography.body1,
    color: Colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  slotsContainer: {
    marginVertical: Spacing.lg,
  },
  slotButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  slotButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotText: {
    ...Typography.body1,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  slotTextSelected: {
    color: Colors.white,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.body2,
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body2,
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.body2,
    color: Colors.text,
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    ...Typography.body2,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  summaryValue: {
    ...Typography.body1,
    color: Colors.text,
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: Spacing.lg,
  },
  backButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: Spacing.lg,
  },
  backButtonText: {
    ...Typography.body1,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.lg,
  },
  nextButtonText: {
    ...Typography.body1,
    color: Colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: Spacing.lg,
  },
  confirmButtonText: {
    ...Typography.body1,
    color: Colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})
