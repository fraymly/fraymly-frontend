export default function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-400">{hint}</p> : null}
    </div>
  )
}
