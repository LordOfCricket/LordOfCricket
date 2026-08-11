import { useCallback, useEffect, useState } from 'react'
import { fetchPendingGroundRegistrations, decideGroundRegistration } from '../services/groundRegistrationApi.js'

// Mirrors useAdminUmpireRequests.js exactly — same load/decide/reload shape,
// for the other pending-approval queue this admin area now has.
export function useAdminGroundRegistrations() {
  const [grounds, setGrounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadGrounds = useCallback(async () => {
    try {
      const data = await fetchPendingGroundRegistrations()
      setGrounds(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load pending ground registrations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadGrounds()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadGrounds])

  const handleDecide = async (ground, status) => {
    const verb = status === 'approved' ? 'Approve' : 'Reject'
    if (!window.confirm(`${verb} "${ground.name}"?`)) return

    setError('')
    try {
      await decideGroundRegistration(ground.publicGroundId, status)
      await loadGrounds()
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update this ground registration.')
    }
  }

  return { grounds, loading, error, handleDecide, refresh: loadGrounds }
}
