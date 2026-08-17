import { useState } from 'react'
import { useAuth } from './useAuth.js'
import { fetchAvailability, createBooking } from '../services/bookingApi.js'
import { todayDateInputValue } from '../models/booking.model.js'

// The homepage booking modal's state machine. Every step
// re-fetches from the server — nothing here decides availability
// itself, and CONFIRM always sends the exact `startTime` instant the server
// already told this client about (never client-computed date+hour+minute
// math — see groundBooking.controller.js#resolveSlotInput).
export function useBookingFlow() {
  const { user } = useAuth()
  const [step, setStep] = useState('date') // date | slots | form | success | conflict
  const [dateStr, setDateStr] = useState(todayDateInputValue())
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [form, setForm] = useState({ purpose: '', expectedPlayers: '', contactPhone: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [alternatives, setAlternatives] = useState([])
  const [confirmedBooking, setConfirmedBooking] = useState(null)
  const [clientActionId] = useState(() => crypto.randomUUID())

  const loadSlots = async (date) => {
    setLoadingSlots(true)
    setError('')
    try {
      const result = await fetchAvailability(date)
      setSlots(result)
      setStep('slots')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load availability for that date.')
    } finally {
      setLoadingSlots(false)
    }
  }

  const chooseDate = (date) => {
    setDateStr(date)
    loadSlots(date)
  }

  const chooseSlot = (slot) => {
    setSelectedSlot(slot)
    setError('')
    setStep('form')
  }

  const chooseAlternative = (slot) => {
    setDateStr(slot.startTime.slice(0, 10))
    setSelectedSlot(slot)
    setError('')
    setStep('form')
  }

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const submit = async () => {
    if (!selectedSlot) return
    if (!user) {
      setError('Please log in to confirm a booking.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const booking = await createBooking({
        startTime: selectedSlot.startTime,
        purpose: form.purpose || null,
        expectedPlayers: form.expectedPlayers ? Number(form.expectedPlayers) : null,
        contactPhone: form.contactPhone || null,
        clientActionId,
      })
      setConfirmedBooking(booking)
      setStep('success')
    } catch (err) {
      if (err.response?.status === 409) {
        setAlternatives(err.response.data.details?.alternatives || [])
        setStep('conflict')
      } else {
        setError(err.response?.data?.message || 'Unable to confirm this booking.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setStep('date')
    setSlots([])
    setSelectedSlot(null)
    setForm({ purpose: '', expectedPlayers: '', contactPhone: '' })
    setError('')
    setAlternatives([])
    setConfirmedBooking(null)
  }

  return {
    step,
    setStep,
    dateStr,
    setDateStr,
    slots,
    loadingSlots,
    selectedSlot,
    form,
    submitting,
    error,
    alternatives,
    confirmedBooking,
    chooseDate,
    chooseSlot,
    chooseAlternative,
    updateForm,
    submit,
    reset,
    isLoggedIn: Boolean(user),
  }
}
