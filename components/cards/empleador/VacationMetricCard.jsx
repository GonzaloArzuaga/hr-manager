import React from "react";

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

const tones = {
  amber: {
    icon: "bg-amber-50 text-amber-700",
    badge: "border-amber-200/60 bg-amber-50 text-amber-700",
    note: "text-amber-700",
  },
  blue: {
    icon: "bg-blue-50 text-blue-600",
    badge: "border-blue-200/60 bg-blue-50 text-blue-700",
    note: "text-slate-500",
  },
  green: {
    icon: "bg-emerald-50 text-emerald-700",
    badge: "border-emerald-200/60 bg-emerald-50 text-emerald-700",
    note: "text-emerald-700",
  },
};

const icons = {
  umbrella: (
    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
  ),
  calendar: (
    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  ),
  balance: (
    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  ),
};

export default function VacationMetricCard({
  title,
  value,
  suffix,
  note,
  badge,
  icon,
  tone = "blue",
  actionLabel,
  actionHref,
}) {
  const toneStyles = tones[tone];

  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[0.5625rem] font-bold uppercase tracking-wide text-slate-500">
          {title}
        </span>
        {badge && (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.5625rem] font-semibold ${toneStyles.badge}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {badge}
          </span>
        )}
        {icon && (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${toneStyles.icon}`}
          >
            <Icon className="h-4 w-4">{icons[icon]}</Icon>
          </span>
        )}
      </div>
      <div className="my-1.5 flex items-baseline gap-1.5">
        <span className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900">
          {value}
        </span>
        {suffix && (
          <span className="text-[0.5625rem] font-medium text-slate-500">{suffix}</span>
        )}
      </div>
      <div className="flex min-h-5 items-center justify-between gap-2 border-t border-slate-100/80 pt-1.5">
        <span className={`text-[0.5625rem] font-medium ${toneStyles.note}`}>{note}</span>
        {actionLabel &&
          (actionHref ? (
            <a
              className="shrink-0 text-[0.5625rem] font-semibold text-blue-600 hover:text-blue-800"
              href={actionHref}
            >
              {actionLabel}
            </a>
          ) : (
            <span className="shrink-0 text-[0.5625rem] font-semibold text-emerald-700">
              {actionLabel}
            </span>
          ))}
      </div>
    </article>
  );
}
