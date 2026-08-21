import ClipCard from '../cards/ClipCard'

export default function ClipTimeline({ clips, selectedClip, onSelectClip }) {
  return (
    <div className="grid gap-4">
      {clips.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
          No clips are ready yet. Once the job is analyzed, the best moments appear here.
        </div>
      ) : (
        clips.map((clip) => (
          <ClipCard key={clip._id} clip={clip} selected={selectedClip?._id === clip._id} onSelect={onSelectClip} />
        ))
      )}
    </div>
  )
}
