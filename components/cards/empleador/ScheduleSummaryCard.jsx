import React from "react";

function Icon({ className, name }) {
  return <i aria-hidden="true" className={`fa-${name} ${className}`} />;
}

export default function ScheduleSummaryCard({
  label,
  value,
  detail,
  note,
  noteTone,
  noteIcon,
}) {
  return (
    <article className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
      <div className="space-y-1">
        <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900">{value}</span>
          <span className="text-[0.5625rem] font-medium text-slate-400">{detail}</span>
        </div>
        <div className={`flex items-center pt-1 text-[0.5625rem] font-medium ${noteTone}`}>
          <Icon className="mr-1 text-xs" name={noteIcon} />
          <span>{note}</span>
        </div>
      </div>
    </article>
  );
}
