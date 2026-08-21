import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

const aspectOptions = [
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
]

const toneOptions = ['energetic', 'calm', 'punchy', 'educational', 'cinematic']

export default function UploadShortsForm({ onSubmit, submitting }) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      projectName: '',
      projectDescription: '',
      shortCount: 5,
      targetDuration: 30,
      aspectRatio: '9:16',
      tone: 'energetic',
    },
  })

  const fileValue = watch('video')
  const fileName = fileValue?.[0]?.name

  useEffect(() => {}, [submitting])

  const submitForm = (values) => {
    if (!values.video?.[0]) return

    const formData = new FormData()
    formData.append('video', values.video[0])
    formData.append('projectName', values.projectName)
    formData.append('projectDescription', values.projectDescription)
    formData.append('shortCount', String(values.shortCount))
    formData.append('targetDuration', String(values.targetDuration))
    formData.append('aspectRatio', values.aspectRatio)
    formData.append('tone', values.tone)

    onSubmit?.(formData, { reset })
  }

  const labelClass =
    'text-[11px] uppercase tracking-[0.28em] text-slate-500'
  const inputClass =
    'w-full border-b border-slate-200 bg-transparent px-0 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950 transition'
  const cardInputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950 transition'

  return (
    <form onSubmit={handleSubmit(submitForm)} className="w-full space-y-6">
      <div className="space-y-6">
        <label className="block">
          <span className={labelClass}>Video file</span>
          <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
            <input
              type="file"
              accept="video/*"
              {...register('video', { required: 'Please choose a video file' })}
              className="block w-full text-sm text-slate-600 file:mr-4 file:border-0 file:bg-transparent file:px-0 file:py-0 file:text-sm file:font-medium file:text-slate-950"
            />
            <p className="mt-2 text-sm text-slate-500">
              {fileName ?? 'Drop a source video here.'}
            </p>
          </div>
          {errors.video ? (
            <span className="mt-2 block text-xs text-rose-600">{errors.video.message}</span>
          ) : null}
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Project name</span>
            <input
              {...register('projectName', { required: 'Project name is required' })}
              className={inputClass}
              placeholder="Launch teaser cutdowns"
            />
            {errors.projectName ? (
              <span className="mt-2 block text-xs text-rose-600">
                {errors.projectName.message}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className={labelClass}>Short count</span>
            <input
              type="number"
              min="1"
              max="20"
              {...register('shortCount', { valueAsNumber: true, required: true })}
              className={inputClass}
            />
          </label>
        </div>

        <label className="block">
          <span className={labelClass}>Description</span>
          <textarea
            {...register('projectDescription')}
            rows="4"
            className={`${inputClass} resize-none`}
            placeholder="Describe the goal, audience, or campaign."
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Target duration</span>
            <input
              type="number"
              min="10"
              max="120"
              {...register('targetDuration', { valueAsNumber: true, required: true })}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Aspect ratio</span>
            <select {...register('aspectRatio')} className={inputClass}>
              {aspectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="block">
          <span className={labelClass}>Tone</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {toneOptions.map((tone) => (
              <label
                key={tone}
                className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition has-[:checked]:border-slate-950 has-[:checked]:text-slate-950"
              >
                <input {...register('tone')} type="radio" value={tone} className="sr-only" />
                {tone}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-6 text-slate-500">
          Creates a project, uploads the file, and starts processing immediately.
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full border border-slate-950 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating...' : 'Create project'}
        </button>
      </div>
    </form>
  )
}