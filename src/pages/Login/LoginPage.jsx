import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { login } from '../../api/auth.api'
import useAppStore from '../../store/useAppStore'
import { APP_NAME } from '../../lib/constants'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAppStore((state) => state.setAuth)

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: {
      email: 'founder@viralforge.ai',
      password: 'viralforge',
      rememberMe: true,
    },
  })

  useEffect(() => {
    document.title = `${APP_NAME} - Login`
  }, [])

  const onSubmit = async (values) => {
    const payload = {
      email: values.email,
      password: values.password,
      name: values.email.split('@')[0],
    }

    const result = await login(payload)
    setAuth({ token: result.token, user: result.user })
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_24%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col justify-between rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-sky-700">Fraymly</p>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight text-slate-900">
              One upload in. A reviewable shorts pipeline out.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Upload a source video, choose your output count and target duration, and move straight into analysis, clip review, and rendering.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ['Upload', 'Create the project and start the pipeline'],
              ['Analyze', 'Surface moments the AI thinks matter'],
              ['Review', 'Edit, render, and export the final shorts'],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="flex items-center"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Login</h2>
            <p className="mt-2 text-sm text-slate-500">Use your workspace credentials or create a new one on first login.</p>

            <div className="mt-8 grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                  placeholder="founder@viralforge.ai"
                />
                {errors.email ? <span className="text-sm text-rose-500">{errors.email.message}</span> : null}
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  {...register('password', { required: 'Password is required' })}
                  type="password"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                  placeholder="••••••••"
                />
                {errors.password ? <span className="text-sm text-rose-500">{errors.password.message}</span> : null}
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input {...register('rememberMe')} type="checkbox" className="h-4 w-4 rounded border-slate-300 bg-white" />
                Remember me
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in...' : 'Continue'}
              </button>
            </div>

            <p className="mt-6 text-sm text-slate-500">
              Forgot password and Google sign-in can come later. This build focuses on getting the shorts workflow working first.
            </p>
          </form>
        </motion.section>
      </div>
    </div>
  )
}
