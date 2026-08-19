import { useCallback, useEffect, useState } from 'react'
import {
  fetchPendingGroundRegistrations,
  approveGroundRegistration,
  rejectGroundRegistration,
  requestGroundRegistrationInformation,
  fetchAmenityCatalog,
} from '../services/groundRegistrationApi.js'
import { useStepUp } from './useStepUp.js'

// Mirrors useAdminUmpireRequests.js's load/reload shape. Phase 4: three
// distinct decisions now (approve/reject/request more info) instead of one
// approved/rejected toggle, since ground_owner_requests has its own richer
// status set (see groundOwnerRequest.service.js).
// Phase 6 — approving is step-up-gated server-side (GROUND_OWNER_REQUEST_
// APPROVE — docs/MFA.md); reject/request-information are not (neither
// grants any privilege).
// SUPER_ADMIN Identity & Secure Provisioning feature — §7 adds a status
// filter (existing backend statuses only — PENDING/UNDER_REVIEW/APPROVED/
// REJECTED/MORE_INFORMATION_REQUIRED — no new enum). '' means "all statuses".
export function useAdminGroundRegistrations() {
  const stepUp = useStepUp()
  const [requests, setRequests] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [amenityCatalog, setAmenityCatalog] = useState([])

  const loadRequests = useCallback(async (status) => {
    setLoading(true)
    try {
      const data = await fetchPendingGroundRegistrations(status || undefined)
      setRequests(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load ground registrations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequests(statusFilter)
    }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  useEffect(() => {
    fetchAmenityCatalog().then(setAmenityCatalog).catch(() => setAmenityCatalog([]))
  }, [])

  const handleApprove = async (request) => {
    if (!window.confirm(`Approve "${request.groundName}"? This creates the ground and grants ownership immediately.`)) return
    setError('')
    try {
      await stepUp.requestStepUp('GROUND_OWNER_REQUEST_APPROVE')
      await approveGroundRegistration(request.publicRequestId)
      await loadRequests(statusFilter)
    } catch (err) {
      if (err.message !== 'Step-up verification was cancelled.') {
        setError(err.response?.data?.error || err.response?.data?.message || 'Unable to approve this request.')
      }
    }
  }

  const handleReject = async (request) => {
    const reason = window.prompt(`Reason for rejecting "${request.groundName}"?`)
    if (!reason) return
    setError('')
    try {
      await rejectGroundRegistration(request.publicRequestId, reason)
      await loadRequests(statusFilter)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reject this request.')
    }
  }

  const handleRequestInformation = async (request) => {
    const notes = window.prompt(`What additional information is needed for "${request.groundName}"?`)
    if (!notes) return
    setError('')
    try {
      await requestGroundRegistrationInformation(request.publicRequestId, notes)
      await loadRequests(statusFilter)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to request more information.')
    }
  }

  return {
    requests,
    statusFilter,
    setStatusFilter,
    amenityCatalog,
    loading,
    error,
    handleApprove,
    handleReject,
    handleRequestInformation,
    refresh: () => loadRequests(statusFilter),
    stepUpModal: stepUp.pending,
    submitStepUp: stepUp.handleSubmit,
    cancelStepUp: stepUp.handleCancel,
  }
}
