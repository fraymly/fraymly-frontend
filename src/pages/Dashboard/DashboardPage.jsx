import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import UploadShortsForm from "../../components/forms/UploadShortsForm";
import Spinner from "../../components/loaders/Spinner";
import { createProject, listProjects, requestSignedUploadUrl, uploadFileWithProgress } from "../../api/projects.api";
import { listJobs } from "../../api/jobs.api";
import { listExports } from "../../api/video.api";
import useAppStore from "../../store/useAppStore";

const FALLBACK_THUMBNAIL =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20viewBox%3D'0%200%20800%20450'%3E%3Crect%20width%3D'800'%20height%3D'450'%20fill%3D'%23f1f5f9'/%3E%3Crect%20x%3D'48'%20y%3D'48'%20width%3D'704'%20height%3D'354'%20rx%3D'28'%20fill%3D'%23ffffff'%20stroke%3D'%23cbd5e1'%20stroke-width%3D'2'/%3E%3Ccircle%20cx%3D'130'%20cy%3D'135'%20r%3D'26'%20fill%3D'%23e2e8f0'/%3E%3Cpath%20d%3D'M102%20300%20L246%20172%20L348%20268%20L454%20160%20L598%20300%20Z'%20fill%3D'%23e2e8f0'/%3E%3Cpath%20d%3D'M510%20208%20L618%20208'%20stroke%3D'%23cbd5e1'%20stroke-width%3D'16'%20stroke-linecap%3D'round'/%3E%3Cpath%20d%3D'M510%20252%20L560%20252'%20stroke%3D'%23cbd5e1'%20stroke-width%3D'16'%20stroke-linecap%3D'round'/%3E%3C/svg%3E";

function getProjectThumbnail(project) {
  return (
    project?.thumbnailUrl ||
    project?.thumbnail ||
    project?.posterUrl ||
    project?.coverUrl ||
    FALLBACK_THUMBNAIL
  );
}

function ProjectCard({ project, onClick }) {
  const thumbnail = getProjectThumbnail(project);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={thumbnail}
          alt={project?.name ?? "Project thumbnail"}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_THUMBNAIL;
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-950">
            {project?.name ?? "Untitled project"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {project?.description?.trim() ? project.description : "No description"}
          </p>
        </div>
        <span className="h-2 w-2 shrink-0 rounded-full bg-slate-950" />
      </div>
    </button>
  );
}

function QueueItem({ job }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-950">
          {job?.name ?? "Untitled job"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {job?.status ?? "processing"}
        </p>
      </div>
      <span className="h-2 w-2 shrink-0 rounded-full bg-slate-950" />
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setActiveProjectId = useAppStore((state) => state.setActiveProjectId);
  const setActiveJobId = useAppStore((state) => state.setActiveJobId);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(""); // "", "requesting", "uploading", "saving"
  const [uploadError, setUploadError] = useState("");

  const handleCreateProject = async (formData, { reset } = {}) => {
    setUploadError("");
    const file = formData.get("video");
    const projectName = formData.get("projectName");
    const projectDescription = formData.get("projectDescription");
    const shortCount = formData.get("shortCount");
    const targetDuration = formData.get("targetDuration");
    const aspectRatio = formData.get("aspectRatio");
    const tone = formData.get("tone");

    if (!file) return;

    let storagePath = null;
    let fileName = null;

    try {
      setUploadStatus("requesting");
      setUploadProgress(0);

      // 1. Request signed URL from our backend API
      const response = await requestSignedUploadUrl(file.name, file.type);
      
      if (response && response.uploadData) {
        const { signedUrl, storagePath: gPath, fileName: gName } = response.uploadData;
        storagePath = gPath;
        fileName = gName;

        setUploadStatus("uploading");
        // 2. Upload directly to GCS bucket via XMLHttpRequest with progress tracking!
        await uploadFileWithProgress(signedUrl, file, (progress) => {
          setUploadProgress(progress);
        });
      }
    } catch (err) {
      console.warn("Signed URL upload failed, falling back to standard backend upload:", err);
      // Fallback silently to normal upload if GCS credentials are not available locally
    }

    setUploadStatus("saving");

    try {
      let payload;
      if (storagePath) {
        // Direct GCS upload payload
        payload = {
          projectName,
          projectDescription,
          shortCount,
          targetDuration,
          aspectRatio,
          tone,
          storagePath,
          fileName,
          originalName: file.name,
          size: file.size,
          mimeType: file.type,
        };
      } else {
        // Standard multer file upload payload fallback
        payload = formData;
      }

      await createProjectMutation.mutateAsync(payload);
      setUploadStatus("");
      reset?.();
    } catch (err) {
      console.error("Failed to create project:", err);
      setUploadError(err.message || "Failed to create project");
      setUploadStatus("");
    }
  };

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const jobsQuery = useQuery({ queryKey: ["jobs"], queryFn: listJobs });

  const exportsQuery = useQuery({
    queryKey: ["exports"],
    queryFn: () => listExports(),
  });

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (data) => {
      setActiveProjectId(data.project?._id ?? null);
      const newProjectId = data.project?._id;

      if (newProjectId) {
        await queryClient.invalidateQueries({ queryKey: ['projects'] });
        await queryClient.invalidateQueries({ queryKey: ['project-workflows', newProjectId] });

        navigate(`/projects/${newProjectId}`);
      }
    },
  });

  const metrics = useMemo(
    () => ({
      projects: projectsQuery.data?.projects?.length ?? 0,
      jobs: jobsQuery.data?.jobs?.length ?? 0,
      exports: exportsQuery.data?.exports?.length ?? 0,
      rendering:
        jobsQuery.data?.jobs?.filter((job) =>
          ["queued", "rendering", "processing"].includes(job.status)
        ).length ?? 0,
    }),
    [exportsQuery.data, jobsQuery.data, projectsQuery.data]
  );

  const recentJobs = jobsQuery.data?.jobs ?? [];
  const recentProjects = projectsQuery.data?.projects ?? [];

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-950">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-8"
        >
          <section className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Dashboard
            </p>
            <h1 className="max-w-3xl text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">
              Upload, process, and export.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-500">
              A minimal workspace for managing your video pipeline.
            </p>
          </section>

          {/* Row 1: full width form */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                New project
              </p>
              {createProjectMutation.isPending ? (
                <span className="text-sm text-slate-500">Creating...</span>
              ) : null}
            </div>

            <div className="pt-5">
              {uploadStatus ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {uploadStatus === 'requesting' && '1. Initializing Cloud Storage...'}
                        {uploadStatus === 'uploading' && `2. Uploading Video (${uploadProgress}%)`}
                        {uploadStatus === 'saving' && '3. Saving Project Details...'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {uploadStatus === 'requesting' && 'Securing direct upload connection to Google Cloud Storage...'}
                        {uploadStatus === 'uploading' && 'Streaming raw media directly to GCS, bypassing gateway limits...'}
                        {uploadStatus === 'saving' && 'Writing project records and starting metadata pipelines...'}
                      </p>
                    </div>
                    {uploadStatus !== 'saving' && (
                      <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                        {uploadProgress}%
                      </span>
                    )}
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 relative">
                    <div 
                      className="h-full rounded-full bg-slate-950 transition-all duration-300"
                      style={{ 
                        width: uploadStatus === 'requesting' 
                          ? '10%' 
                          : uploadStatus === 'saving' 
                            ? '95%' 
                            : `${uploadProgress}%` 
                      }} 
                    />
                  </div>

                  {uploadError && (
                    <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-lg mt-3">
                      Error: {uploadError}
                      <button 
                        onClick={() => {
                          setUploadStatus('')
                          setUploadError('')
                        }}
                        className="ml-2 underline font-semibold text-rose-800"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <UploadShortsForm
                  submitting={createProjectMutation.isPending}
                  onSubmit={handleCreateProject}
                />
              )}
            </div>
          </section>

          {/* Row 2: queue + projects */}
          <section className="grid gap-6 xl:grid-cols-[0.28fr_1fr]">
            {/* Queue overview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 xl:sticky xl:top-6 xl:self-start">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                  Queue
                </p>
                <span className="text-sm text-slate-500">{metrics.rendering} active</span>
              </div>

              <div className="mt-4">
                {jobsQuery.isLoading ? (
                  <div className="flex items-center gap-3 py-3 text-sm text-slate-500">
                    <Spinner />
                    Loading jobs
                  </div>
                ) : (
                  <div className="space-y-0">
                    {recentJobs.slice(0, 6).map((job) => (
                      <QueueItem key={job._id} job={job} />
                    ))}

                    {!recentJobs.length ? (
                      <div className="py-3 text-sm text-slate-500">No jobs yet.</div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Projects grid */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                  Projects
                </p>
                <span className="text-sm text-slate-500">{metrics.projects} total</span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {recentProjects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onClick={() => navigate(`/projects/${project._id}`)}
                  />
                ))}

                {!projectsQuery.isLoading && recentProjects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No projects yet.
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}