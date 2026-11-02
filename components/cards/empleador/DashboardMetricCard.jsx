import React from "react";

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export default function DashboardMetricCard({ metric, icon }) {
  const isAttendance = metric.id === "todayAttendance";

  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">
            {metric.label}
          </span>
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 text-blue-600">
            <Icon className="h-3.5 w-3.5">{icon}</Icon>
          </div>
        </div>
        {isAttendance ? (
          <>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className="text-3xl font-extrabold leading-8 tracking-tight text-slate-900">
                {metric.value}%
              </span>
              <span className="text-[0.5625rem] font-medium text-blue-700">
                {metric.present} / {metric.total} presentes
              </span>
            </div>
            <div
              aria-label={`Asistencia ${metric.value}%`}
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
              role="meter"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={metric.value}
            >
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${metric.value}%` }}
              />
            </div>
          </>
        ) : (
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold leading-8 tracking-tight text-slate-900">
              {metric.value}
            </span>
            {metric.trend ? (
              <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[0.5625rem] font-semibold text-blue-700">
                {metric.trend}
              </span>
            ) : (
              <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[0.5625rem] font-semibold text-blue-700">
                {metric.status}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-[0.5625rem]">
        <span className="text-slate-500">{metric.detail}</span>
        {isAttendance ? (
          <span className="font-semibold text-slate-700">{metric.shift}</span>
        ) : (
          <a
            className="flex items-center font-medium text-blue-600 transition-colors hover:text-blue-800"
            href={metric.href ?? "#"}
          >
            {metric.action}
            <span className="ml-1">→</span>
          </a>
        )}
      </div>
    </article>
  );
}
