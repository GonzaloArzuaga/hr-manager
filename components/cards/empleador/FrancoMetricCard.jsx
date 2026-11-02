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

export default function FrancoMetricCard({ title, value, badge, note, style }) {
  const styles = {
    amber: {
      icon: "bg-amber-50 text-amber-700",
      badge: "bg-amber-50 text-amber-800",
      symbol: (
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      ),
    },
    green: {
      icon: "bg-emerald-50 text-emerald-700",
      badge: "bg-emerald-50 text-emerald-700",
      symbol: (
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    slate: {
      icon: "bg-blue-50 text-blue-600",
      badge: "bg-slate-100 text-slate-700",
      symbol: (
        <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      ),
    },
  }[style];

  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <div className="mb-2 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {value}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-[0.5625rem] font-semibold ${styles.badge}`}
            >
              {badge}
            </span>
          </div>
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
          >
            <Icon className="h-5 w-5">{styles.symbol}</Icon>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[0.5625rem] text-slate-500">{note}</p>
    </article>
  );
}
