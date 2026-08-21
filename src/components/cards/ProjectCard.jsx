import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { formatSeconds } from '../../lib/format'

export default function ProjectCard({ project, summary }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.18 }} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Project</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{project.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-slate-400">{project.description || 'No description provided.'}</p>
        </div>
        <span className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-medium text-slate-950">
          {project.status ?? 'draft'}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-300">
        <div className="rounded-2xl bg-slate-950 p-3">
          <p className="text-slate-500">Jobs</p>
          <p className="mt-1 text-lg font-semibold text-white">{summary?.jobs ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-slate-950 p-3">
          <p className="text-slate-500">Clips</p>
          <p className="mt-1 text-lg font-semibold text-white">{summary?.clips ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-slate-950 p-3">
          <p className="text-slate-500">Exports</p>
          <p className="mt-1 text-lg font-semibold text-white">{summary?.exports ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-slate-950 p-3">
          <p className="text-slate-500">Video</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatSeconds(summary?.durationSeconds ?? 0)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link to={`/projects/${project._id}`} className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">
          Open project
        </Link>
        <Link to={`/editor/${project._id}`} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Edit timeline
        </Link>
      </div>
    </motion.div>
  )
}
