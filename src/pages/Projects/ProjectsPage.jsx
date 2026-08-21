import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import Spinner from '../../components/loaders/Spinner'
import { listProjects } from '../../api/projects.api'
import { listJobs } from '../../api/jobs.api'
import { listExports } from '../../api/video.api'

const FALLBACK_THUMBNAIL =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20viewBox%3D'0%200%20800%20450'%3E%3Crect%20width%3D'800'%20height%3D'450'%20fill%3D'%23f1f5f9'/%3E%3Crect%20x%3D'48'%20y%3D'48'%20width%3D'704'%20height%3D'354'%20rx%3D'28'%20fill%3D'%23ffffff'%20stroke%3D'%23cbd5e1'%20stroke-width%3D'2'/%3E%3Ccircle%20cx%3D'130'%20cy%3D'135'%20r%3D'26'%20fill%3D'%23e2e8f0'/%3E%3Cpath%20d%3D'M102%20300%20L246%20172%20L348%20268%20L454%20160%20L598%20300%20Z'%20fill%3D'%23e2e8f0'/%3E%3Cpath%20d%3D'M510%20208%20L618%20208'%20stroke%3D'%23cbd5e1'%20stroke-width%3D'16'%20stroke-linecap%3D'round'/%3E%3Cpath%20d%3D'M510%20252%20L560%20252'%20stroke%3D'%23cbd5e1'%20stroke-width%3D'16'%20stroke-linecap%3D'round'/%3E%3C/svg%3E"

function getProjectThumbnail(project) {
  return (
    project?.thumbnailUrl ||
    project?.thumbnail ||
    project?.posterUrl ||
    project?.coverUrl ||
    FALLBACK_THUMBNAIL
  )
}

function ProjectCard({ project, jobsCount, exportsCount }) {
  const thumbnail = getProjectThumbnail(project)

  return (
    <Link
      to={`/projects/${project._id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={thumbnail}
          alt={project?.name ?? 'Project thumbnail'}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = FALLBACK_THUMBNAIL
          }}
        />
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-slate-950">
            {project.name ?? 'Untitled project'}
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
            {project.description ?? 'No description added.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            {jobsCount} jobs
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            {exportsCount} exports
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function ProjectsPage() {
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects })
  const jobsQuery = useQuery({ queryKey: ['jobs'], queryFn: listJobs })
  const exportsQuery = useQuery({ queryKey: ['exports'], queryFn: () => listExports() })

  const projects = projectsQuery.data?.projects ?? []
  const jobs = jobsQuery.data?.jobs ?? []
  const exportsList = exportsQuery.data?.exports ?? []

  const stats = useMemo(
    () => ({
      projects: projects.length,
      jobs: jobs.length,
      exports: exportsList.length,
    }),
    [exportsList.length, jobs.length, projects.length],
  )

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-950">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="space-y-8">
          {/* <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link to="/" className="transition hover:text-slate-950">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-950">Projects</span>
          </nav> */}

          <section className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Projects
            </p>
            <h1 className="max-w-3xl text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">
              Project history
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">
              Each project owns the upload, its analysis, the generated shorts, and the final exports.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Projects</p>
              <p className="mt-2 text-2xl font-medium text-slate-950">{stats.projects}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Jobs</p>
              <p className="mt-2 text-2xl font-medium text-slate-950">{stats.jobs}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Exports</p>
              <p className="mt-2 text-2xl font-medium text-slate-950">{stats.exports}</p>
            </div>
          </section>

          {(projectsQuery.isLoading || jobsQuery.isLoading || exportsQuery.isLoading) ? (
            <div className="py-10">
              <Spinner />
            </div>
          ) : null}

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                  List
                </p>
                <h2 className="mt-2 text-2xl font-medium tracking-tight text-slate-950">
                  All projects
                </h2>
              </div>
              <span className="text-sm text-slate-500">{projects.length} total</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  jobsCount={jobs.filter((job) => job.projectId === project._id).length}
                  exportsCount={exportsList.filter((item) => item.projectId === project._id).length}
                />
              ))}

              {!projectsQuery.isLoading && projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                  No projects yet. Start from the dashboard.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}