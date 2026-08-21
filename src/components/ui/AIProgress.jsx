import { useEffect } from 'react'
import useAppStore from '../../store/useAppStore'

export default function AIProgress() {
  const aiProgress = useAppStore((s) => s.aiProgress)
  const clearAiProgress = useAppStore((s) => s.clearAiProgress)

  useEffect(() => {
    if (aiProgress?.progress === 100) {
      const timer = setTimeout(() => {
        clearAiProgress()
      }, 4000) // Auto-close 4 seconds after completion
      return () => clearTimeout(timer)
    }
  }, [aiProgress?.progress, clearAiProgress])

  if (!aiProgress) return null

  const { stage, title, progress, taskId, error } = aiProgress

  return (
    <div className="fixed right-6 top-6 z-50 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg animate-in slide-in-from-top">
      <button onClick={clearAiProgress} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500">AI Pipeline</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{title ?? stage}</div>
        </div>
        <div className="text-xs text-slate-500">{taskId ? String(taskId).slice(0, 6) : null}</div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${error ? 'bg-rose-500' : 'bg-sky-500'}`} style={{ width: `${progress ?? 0}%` }} />
      </div>

      {error ? (
        <div className="mt-3 text-sm text-rose-700">Error: {aiProgress.error ?? 'Unknown'}</div>
      ) : (
        <div className="mt-3 text-sm text-slate-500">{progress ?? 0}% — {stage}</div>
      )}
    </div>
  )
}
