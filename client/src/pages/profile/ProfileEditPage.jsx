import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import { PLAYING_ROLE_LABELS, BATTING_STYLE_LABELS, BOWLING_STYLE_LABELS } from '../../models/player.model.js'

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-3 block text-sm font-semibold tracking-wide text-slate-200">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-base text-white outline-none backdrop-blur-md transition-all duration-300 focus:border-green-400 focus:bg-white/10 focus:ring-4 focus:ring-green-500/20"
      >
        <option value="" className="bg-slate-900">
          — Not set —
        </option>
        {Object.entries(options).map(([value_, label_]) => (
          <option key={value_} value={value_} className="bg-slate-900">
            {label_}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function ProfileEditPage() {
  const { user, player, refreshPlayer, savePlayer } = useAuth()
  const navigate = useNavigate()
  const [playerLoaded, setPlayerLoaded] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    refreshPlayer().finally(() => setPlayerLoaded(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Adjust state during render (not in an Effect) once the player profile has
  // resolved, per https://react.dev/learn/you-might-not-need-an-effect —
  // avoids the extra render-then-fetch-then-render waterfall an Effect would add.
  if (playerLoaded && form === null) {
    setForm({
      name: player?.name ?? user?.name ?? '',
      role: player?.role ?? null,
      batting_style: player?.batting_style ?? null,
      bowling_style: player?.bowling_style ?? null,
      jersey_number: player?.jersey_number ?? '',
      city: player?.city ?? '',
      bio: player?.bio ?? '',
      photo_url: player?.photo_url ?? '',
    })
  }

  if (!form) return null

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await savePlayer({
        name: form.name.trim(),
        role: form.role,
        batting_style: form.batting_style,
        bowling_style: form.bowling_style,
        jersey_number: form.jersey_number === '' ? null : Number(form.jersey_number),
        city: form.city.trim() || null,
        bio: form.bio.trim() || null,
        photo_url: form.photo_url.trim() || null,
      })
      navigate('/profile')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 py-10 text-white sm:px-6 lg:px-8"
      style={{
        backgroundImage: `linear-gradient(rgba(2,6,23,0.78), rgba(2,6,23,0.78)), url('/images/cricket-stadium.jpg')`,
      }}
    >
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-100/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </button>

        <h1 className="mt-6 text-3xl font-bold text-white">Edit Profile</h1>
        <p className="mt-1 text-sm text-slate-300">Update your cricket identity. Statistics are derived from official matches and can't be edited here.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          {error && <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-rose-300">{error}</div>}

          <Input label="Display Name" value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={100} required />
          <Input label="Profile Photo URL" value={form.photo_url} onChange={(e) => set('photo_url')(e.target.value)} placeholder="https://…" />

          <div className="grid gap-6 sm:grid-cols-2">
            <Select label="Playing Role" value={form.role} onChange={set('role')} options={PLAYING_ROLE_LABELS} />
            <Input
              label="Jersey Number"
              type="number"
              min={0}
              max={999}
              value={form.jersey_number}
              onChange={(e) => set('jersey_number')(e.target.value)}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Select label="Batting Style" value={form.batting_style} onChange={set('batting_style')} options={BATTING_STYLE_LABELS} />
            <Select label="Bowling Style" value={form.bowling_style} onChange={set('bowling_style')} options={BOWLING_STYLE_LABELS} />
          </div>

          <Input label="City" value={form.city} onChange={(e) => set('city')(e.target.value)} maxLength={100} />

          <label className="block">
            <span className="mb-3 block text-sm font-semibold tracking-wide text-slate-200">Short Bio</span>
            <textarea
              value={form.bio}
              onChange={(e) => set('bio')(e.target.value)}
              maxLength={280}
              rows={3}
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-base text-white outline-none backdrop-blur-md transition-all duration-300 focus:border-green-400 focus:bg-white/10 focus:ring-4 focus:ring-green-500/20"
            />
          </label>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="h-12 px-6">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="h-12 rounded-2xl border border-white/15 px-6 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
