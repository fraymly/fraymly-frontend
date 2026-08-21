import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { formatSeconds, humanizeStatus } from '../../lib/format'

const statusTone = {
  queued: 'bg-slate-400/15 text-slate-300',
  rendering: 'bg-amber-400/15 text-amber-300',
  processing: 'bg-blue-400/15 text-blue-300',
  completed: 'bg-emerald-400/15 text-emerald-300',
  failed: 'bg-rose-400/15 text-rose-300',
}

export default function JobCard({ job }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Render queue</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Job {job._id.slice(0, 8)}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone[job.status] ?? statusTone.queued}`}>
          {humanizeStatus(job.status)}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" style={{ width: `${job.progress ?? 0}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-400">
        <div>
          <p>Progress</p>
          <p className="mt-1 text-lg font-semibold text-white">{job.progress ?? 0}%</p>
        </div>
        <div>
          <p>Target</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatSeconds(job.targetDuration ?? 0)}</p>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-300">{job.currentStep ?? 'Waiting for the pipeline to start.'}</p>

      <div className="mt-5 flex gap-3">
        <Link to={`/projects/${job.projectId}`} className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950">
          View project
        </Link>
        <Link to={`/editor/${job.projectId}`} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Review clips
        </Link>
      </div>
    </motion.div>
  )
}
