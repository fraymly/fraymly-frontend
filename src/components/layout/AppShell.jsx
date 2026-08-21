import { NavLink, Outlet } from "react-router";
import useAppStore from "../../store/useAppStore";
import { APP_NAME, NAV_ITEMS, WORKFLOW_NAV_ITEM } from "../../lib/constants";
import AIProgress from "../ui/AIProgress";
import { LogOut, Waypoints } from "lucide-react";

const navClass = ({ isActive }) =>
  [
    "rounded-2xl px-4 py-3 text-sm font-medium transition",
    isActive
      ? "bg-sky-600 text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");

export default function AppShell() {
  const user = useAppStore((state) => state.user);
  const socketConnected = useAppStore((state) => state.socketConnected);
  const clearAuth = useAppStore((state) => state.clearAuth);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside
          className="
    group hidden xl:flex flex-col
    w-[72px] hover:w-64
    transition-all duration-300 ease-out
    border-r border-slate-200/70
    bg-white
    py-4
    overflow-hidden
    select-none
  "
        >
          {/* Logo */}
          <div className="px-4 mb-8 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-600 flex items-center justify-center shrink-0">
              {/* <Logo className="h-5 w-5 text-white" /> */}
              {/* ViralForge AI */}
              <Waypoints className="text-white" />
            </div>

            <div className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap">
              <h2 className="font-semibold text-slate-900">{APP_NAME}</h2>

              <p className="text-xs text-slate-500">Shorts Engine</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `
          flex items-center gap-3
          h-11 rounded-xl
          px-3
          transition-all
          ${
            isActive
              ? "bg-slate-100 text-slate-900"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }
        `
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />

                <span
                  className="
            whitespace-nowrap
            opacity-0
            -translate-x-2
            group-hover:opacity-100
            group-hover:translate-x-0
            transition-all
            duration-200
          "
                >
                  {item.label}
                </span>
              </NavLink>
            ))}

            {/* New Workflow Templates Link */}
            <NavLink
              to={WORKFLOW_NAV_ITEM.to}
              className={({ isActive }) =>
                `
          flex items-center gap-3
          h-11 rounded-xl
          px-3
          transition-all
          ${
            isActive
              ? "bg-slate-100 text-slate-900"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }
        `
              }
            >
              <WORKFLOW_NAV_ITEM.icon className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                {WORKFLOW_NAV_ITEM.label}
                </span>
              </NavLink>
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-200/70 px-2 pt-3">
            <div
              className="
        flex items-center
        gap-3
        rounded-xl
        px-3
        py-2
        hover:bg-slate-100
        transition
      "
            >
              <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-medium">
                  {(user?.name || user?.email || "G")[0]}
                </div>

                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                    socketConnected ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </div>

              <div
                className="
          flex-1
          min-w-0
          opacity-0
          group-hover:opacity-100
          transition
        "
              >
                <p className="truncate text-sm font-medium text-slate-900">
                  {user?.name ?? user?.email ?? "Guest"}
                </p>

                <p className="text-xs text-slate-500">
                  {socketConnected ? "Connected" : "Offline"}
                </p>
              </div>

              <button
                onClick={clearAuth}
                className="
          opacity-0
          group-hover:opacity-100
          transition
          text-slate-400
          hover:text-red-500
        "
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </aside>

        <div className="max-h-screen overflow-y-auto flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            {/* <div className="flex items-center gap-4 px-5 py-4 lg:px-8">
              <div className="flex-1">
                <p className="text-sm text-slate-500">What should I do next?</p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Create, process, review, export.
                </h2>
              </div>
            </div> */}

            <div className="flex gap-2 overflow-x-auto border-t border-slate-200 px-5 py-3 xl:hidden">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={navClass}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </header>

          <main className="flex-1">
            <AIProgress />
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}