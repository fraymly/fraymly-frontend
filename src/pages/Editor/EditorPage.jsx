import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { motion } from 'framer-motion'
import { getEditorProject, updateEditorClip } from '../../api/editor.api'
import Spinner from '../../components/loaders/Spinner'
import ClipCard from '../../components/cards/ClipCard'
import { SERVER_URL } from '../../lib/constants'
import { formatSeconds } from '../../lib/format'

export default function EditorPage() {
  const { projectId } = useParams()
  const queryClient = useQueryClient()
  const [selectedClip, setSelectedClip] = useState(null)

  const editorQuery = useQuery({
    queryKey: ['editor-project', projectId],
    queryFn: () => getEditorProject(projectId),
    enabled: Boolean(projectId),
  })

  const project = editorQuery.data?.project
  const clips = editorQuery.data?.clips ?? []
  const exports = editorQuery.data?.exports ?? []

  useEffect(() => {
    if (!selectedClip && clips.length > 0) {
      setSelectedClip(clips[0])
    }
  }, [clips, selectedClip])

  const updateMutation = useMutation({
    mutationFn: ({ clipId, payload }) => updateEditorClip(clipId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['editor-project', projectId] })
    },
  })

  const active = useMemo(() => selectedClip ?? clips[0] ?? null, [clips, selectedClip])

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Timeline editor</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">{project?.name ?? 'Loading editor...'}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          This is the simplified editing space. Choose a clip, refine its hook, and push it toward render or export.
        </p>
      </div>

      {editorQuery.isLoading ? <Spinner /> : null}

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Clips</p>
            <div className="mt-4 grid gap-3">
              {clips.map((clip) => (
                <ClipCard key={clip._id} clip={clip} selected={active?._id === clip._id} onSelect={setSelectedClip} />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Exports</p>
            <div className="mt-4 grid gap-3">
              {exports.map((item) => (
                <a
                  key={item._id}
                  href={`${SERVER_URL}${item.outputUrl}`}
                  target="_blank"
                  rel="noreferrer"
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-white transition hover:bg-slate-800"
                >
                  {item.outputUrl}
                </a>
              ))}
              {exports.length === 0 ? <p className="text-sm text-slate-400">Rendered exports will populate after clips finish rendering.</p> : null}
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5">
          {active ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Selected clip</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{active.title}</h3>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-300">{active.notes}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-300">Start: {formatSeconds(active.startTime)}</div>
                  <div className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-300">End: {formatSeconds(active.endTime)}</div>
                  <div className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-300">Hook score: {active.score}</div>
                  <div className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-300">Status: {active.status}</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">Title</span>
                  <input defaultValue={active.title} id="clip-title" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">Status</span>
                  <select defaultValue={active.status} id="clip-status" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
                    <option value="queued">queued</option>
                    <option value="rendering">rendering</option>
                    <option value="ready">ready</option>
                    <option value="failed">failed</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">Start Time</span>
                  <input defaultValue={active.startTime} id="clip-start" type="number" step="0.1" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">End Time</span>
                  <input defaultValue={active.endTime} id="clip-end" type="number" step="0.1" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-200">Editor notes</span>
                <textarea
                  defaultValue={active.notes}
                  id="clip-notes"
                  rows="4"
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    updateMutation.mutate({
                      clipId: active._id,
                      payload: {
                        title: document.getElementById('clip-title')?.value,
                        status: document.getElementById('clip-status')?.value,
                        startTime: Number(document.getElementById('clip-start')?.value),
                        endTime: Number(document.getElementById('clip-end')?.value),
                        notes: document.getElementById('clip-notes')?.value,
                      },
                    })
                  }
                  className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950"
                >
                  Save clip
                </button>
                <button type="button" className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                  Render
                </button>
                <button type="button" className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                  Duplicate
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No clips are available yet.</p>
          )}
        </motion.div>
      </section>
    </div>
  )
}
