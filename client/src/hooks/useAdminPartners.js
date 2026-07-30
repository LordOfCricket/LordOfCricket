import { useEffect, useState } from 'react'
import { getPartners, uploadPartner, deletePartner, nextSortOrder } from '../models/adminPartners.model.js'

export function useAdminPartners() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    getPartners()
      .then(setPartners)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !name) return
    setSubmitting(true)
    setError('')
    try {
      await uploadPartner({ file, name, websiteUrl, sortOrder: nextSortOrder(partners) })
      setFile(null)
      setName('')
      setWebsiteUrl('')
      e.target.reset()
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    await deletePartner(id)
    setPartners((prev) => prev.filter((p) => p.id !== id))
  }

  return {
    partners,
    loading,
    file,
    setFile,
    name,
    setName,
    websiteUrl,
    setWebsiteUrl,
    submitting,
    error,
    handleUpload,
    handleDelete,
  }
}
