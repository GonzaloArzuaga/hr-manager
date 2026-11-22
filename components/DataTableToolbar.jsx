import React from "react";

export function DataTableToolbar({ children, title, titleId }) {
  return (
    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
      <h2 className="text-sm font-bold tracking-tight text-slate-900" id={titleId}>
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function TableSearchInput({ ariaLabel, onChange, placeholder, value }) {
  return (
    <label className="relative block w-full sm:w-56">
      <span className="sr-only">{ariaLabel}</span>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        className="hr-field w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 text-[0.5625rem] font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        onChange={onChange}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </label>
  );
}
