import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Spinner from '../../components/loaders/Spinner'
import { getSettings, updateSettings } from '../../api/settings.api'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings })

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      brandName: 'Fraymly',
      defaultShortCount: 5,
      defaultShortDuration: 30,
      aspectRatio: '9:16',
      theme: 'system',
    },
  })

  useEffect(() => {
    if (settingsQuery.data?.settings) {
      reset(settingsQuery.data.settings)
    }
  }, [reset, settingsQuery.data])

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-600">Settings</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Workspace configuration</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
          Tune the defaults for new projects and keep the brand settings consistent across output exports.
        </p>
      </div>

      {settingsQuery.isLoading ? <Spinner /> : null}

      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Brand Name</span>
            <input {...register('brandName')} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-sky-400" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Theme</span>
            <select {...register('theme')} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-sky-400">
              <option value="system">System</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Default Short Count</span>
            <input type="number" {...register('defaultShortCount', { valueAsNumber: true })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-sky-400" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Default Short Duration</span>
            <input type="number" {...register('defaultShortDuration', { valueAsNumber: true })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-sky-400" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Default Aspect Ratio</span>
            <input {...register('aspectRatio')} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-sky-400" />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 transition disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
