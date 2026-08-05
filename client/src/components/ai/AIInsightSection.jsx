import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAIInsight } from '../../hooks/useAIInsight.js'

// Phase 16 Part 33/37/38 — a clearly-labeled, bounded, independently-loading
// section. Never rendered in a way that could be mistaken for the
// authoritative scorecard/stats above it — a distinct "✨ AI ..." badge, a
// visually separate card, and every unavailable state (not configured, not
// enough data yet, provider hiccup) fails soft with a plain sentence, never
// an error banner or a broken layout.

const UNAVAILABLE_COPY = {
  NOT_CONFIGURED: 'AI insight is not configured for this site.',
  INSUFFICIENT_DATA: 'Not enough data for an insight yet.',
  PROVIDER_ERROR: 'AI insight is temporarily unavailable.',
  DECLINED: 'AI insight is temporarily unavailable.',
  INVALID_OUTPUT: 'AI insight is temporarily unavailable.',
}

function Highlights({ items }) {
  if (!items || items.length === 0) return null
  return (
    <ul className="mt-3 flex flex-col gap-1.5 text-sm text-slate-300">
      {items.map((h, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-emerald-400">•</span>
          <span>{h}</span>
        </li>
      ))}
    </ul>
  )
}

function KeyMoments({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-4">
      <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-300">Key Moments</h4>
      <ul className="mt-2 flex flex-col gap-2 text-sm text-slate-300">
        {items.map((km, i) => (
          <li key={i} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            {km.ballLabel && <span className="mr-2 font-mono text-xs text-slate-400">{km.ballLabel}</span>}
            {km.explanation}
          </li>
        ))}
      </ul>
    </div>
  )
}

function StandoutPerformers({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-4">
      <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-300">Standout Performers</h4>
      <ul className="mt-2 flex flex-col gap-2 text-sm text-slate-300">
        {items.map((p, i) => (
          <li key={i}>
            {p.publicPlayerId ? (
              <Link to={`/players/${p.publicPlayerId}`} className="font-semibold text-white hover:text-emerald-300">
                {p.publicPlayerId}
              </Link>
            ) : null}
            {' — '}
            {p.reason}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** @param kind - 'match' (headline/summary/keyMoments/standoutPerformers) or 'person' (headline/summary/highlights) */
export default function AIInsightSection({ title, fetchFn, id, kind = 'person' }) {
  const { result, loading, error } = useAIInsight(fetchFn, id)

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <SectionLabel title={title} />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-4 w-full animate-pulse rounded bg-white/5" />
      </div>
    )
  }

  // A network/HTTP-level error (not the normal `available:false` shape) —
  // still fails soft, never a page-breaking error state.
  if (error || !result) {
    return null
  }

  if (!result.available) {
    const copy = UNAVAILABLE_COPY[result.reason] || 'AI insight is unavailable.'
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5">
        <SectionLabel title={title} />
        <p className="mt-2 text-sm text-slate-400">{copy}</p>
      </div>
    )
  }

  const insight = result.insight
  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
      <SectionLabel title={title} />
      <h3 className="mt-2 text-lg font-bold text-white">{insight.headline}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{insight.summary}</p>
      {kind === 'match' ? (
        <>
          <KeyMoments items={insight.keyMoments} />
          <StandoutPerformers items={insight.standoutPerformers} />
        </>
      ) : (
        <Highlights items={insight.highlights} />
      )}
    </div>
  )
}

function SectionLabel({ title }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-300">
      <Sparkles className="h-3.5 w-3.5" />
      {title}
    </span>
  )
}
