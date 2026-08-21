import { motion } from 'framer-motion'
import { formatSeconds } from '../../lib/format'

const toneMap = {
  ready: 'bg-emerald-400/15 text-emerald-300',
  rendering: 'bg-amber-400/15 text-amber-300',
  queued: 'bg-slate-400/15 text-slate-300',
  failed: 'bg-rose-400/15 text-rose-300',
}

export default function ClipCard({ clip, selected, onSelect }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      onClick={() => onSelect?.(clip)}
      className={[
        'w-full rounded-3xl border p-4 text-left transition',
        selected ? 'border-cyan-400 bg-cyan-950' : 'border-slate-800 bg-slate-900 hover:bg-slate-800',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Short {clip.index}</p>
          <h4 className="mt-2 text-lg font-semibold text-white">{clip.title}</h4>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${toneMap[clip.status] ?? toneMap.queued}`}>
          {clip.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-400">
        <div className="rounded-2xl bg-slate-950 p-3">
          <p>Length</p>
          <p className="mt-1 text-base font-semibold text-white">{formatSeconds(clip.durationSeconds)}</p>
        </div>
        <div className="rounded-2xl bg-slate-950 p-3">
          <p>Score</p>
          <p className="mt-1 text-base font-semibold text-white">{clip.score ?? 0}</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm text-slate-300">{clip.notes ?? 'Planned clip ready for review.'}</p>
    </motion.button>
  )
}
