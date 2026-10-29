import React from "react";

export default function DepartmentDistributionCard({ areaCounts, totalEmployees }) {
  const areas = Object.entries(areaCounts).sort((first, second) => second[1] - first[1]);
  const segmentColors = ["bg-blue-700", "bg-blue-400", "bg-blue-300", "bg-slate-300"];
  const formatPercentage = (count) => {
    if (totalEmployees === 0) return "0";
    return ((count / totalEmployees) * 100).toFixed(1).replace(/\.0$/, "");
  };

  return (
    <article className="flex min-h-[5.75rem] flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-[0.5625rem] font-bold tracking-wide text-slate-600">DISTRIBUCIÓN POR ÁREAS</h2>
        <svg aria-hidden="true" className="h-3.5 w-3.5 text-blue-700" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M12 3v18m9-9H3m15.36-6.36L5.64 18.36m12.72 0L5.64 5.64" />
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-1 text-[0.5rem] font-semibold text-slate-700">
        {areas.map(([name, count], index) => (
          <React.Fragment key={name}>
            {index > 0 && <span aria-hidden="true">/</span>}
            <span>{name} {formatPercentage(count)}% ({count})</span>
          </React.Fragment>
        ))}
      </div>
      <div aria-label="Distribución de empleados por área" className="my-1 flex h-1 overflow-hidden rounded-full bg-slate-100">
        {areas.map(([name, count], index) => (
          <span
            className={`h-full ${segmentColors[index % segmentColors.length]}`}
            key={name}
            style={{ width: `${totalEmployees === 0 ? 0 : (count / totalEmployees) * 100}%` }}
            title={`${name}: ${count}`}
          />
        ))}
      </div>
    </article>
  );
}
