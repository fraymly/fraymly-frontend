import { useQuery } from '@tanstack/react-query'
import { listExports } from '../../api/video.api'
import Spinner from '../../components/loaders/Spinner'
import { SERVER_URL, AUTH_TOKEN_KEY } from '../../lib/constants'
import { formatSeconds } from '../../lib/format'

export default function ExportsPage() {
  const exportsQuery = useQuery({ queryKey: ['exports'], queryFn: () => listExports() })
  const token = localStorage.getItem(AUTH_TOKEN_KEY) ?? ''

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-600">Exports</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Finished shorts Plan</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
          Once clips finish rendering, they appear here with inline playback and instant download.
        </p>
      </div>

      {exportsQuery.isLoading ? <Spinner /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {(exportsQuery.data?.exports ?? []).map((item) => (
          <div
            key={item._id}
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Export ready</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">{item.title ?? 'Clip export'}</h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">{item.status}</span>
            </div>

            {/* Beautiful 9:16 Video Player */}
            <div className="mt-4 rounded-2xl overflow-hidden bg-slate-950 h-[360px] flex items-center justify-center relative">
              <video
                src={`${SERVER_URL}/api/exports/${item._id}/download?token=${encodeURIComponent(token)}`}
                controls
                preload="metadata"
                playsInline
                className="h-full max-w-full object-contain"
              />
            </div>

            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-slate-800">Clip Index: {item.clipIndex ?? item.clipId?.slice(0, 8) ?? '1'}</div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-slate-800">Duration: {formatSeconds(item.durationSeconds ?? 0)}</div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 sm:col-span-2 flex items-center justify-between gap-2 overflow-hidden">
                <span className="truncate text-xs text-slate-400 font-mono">{item.outputUrl}</span>
                <a
                  href={`${SERVER_URL}/api/exports/${item._id}/download?download=true&token=${encodeURIComponent(token)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 transition shrink-0"
                >
                  Download
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(exportsQuery.data?.exports?.length ?? 0) === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm text-center py-12">
          No exports have finished yet. The rendering queue will populate this page automatically.
        </div>
      ) : null}
    </div>
  )
}
