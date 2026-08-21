export default function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/40 border-t-cyan-300" />
      <span>{label}</span>
    </div>
  )
}

