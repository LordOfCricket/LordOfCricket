import { useCallback, useEffect, useState } from 'react'
import { fetchAllGrounds, suspendGround, reactivateGround } from '../services/adminApi.js'

// SUPER_ADMIN Identity & Secure Provisioning feature — "All Grounds" (§11).
export function useAdminAllGrounds() {
  const [grounds, setGrounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setGrounds(await fetchAllGrounds())
    } catch {
      setError('Unable to load grounds.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const handleSuspend = async (ground) => {
    if (!window.confirm(`Suspend "${ground.name}"? It will be removed from public discovery immediately.`)) return
    setError('')
    try {
      await suspendGround(ground.publicGroundId)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to suspend this ground.')
    }
  }

  const handleReactivate = async (ground) => {
    if (!window.confirm(`Reactivate "${ground.name}"? It will become publicly visible again.`)) return
    setError('')
    try {
      await reactivateGround(ground.publicGroundId)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reactivate this ground.')
    }
  }

  return { grounds, loading, error, handleSuspend, handleReactivate }
}
