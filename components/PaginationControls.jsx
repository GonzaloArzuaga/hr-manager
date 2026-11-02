import React from "react";

function getPageItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis-end", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis-start", totalPages - 2, totalPages - 1, totalPages];
  }

  return [
    1,
    "ellipsis-start",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-end",
    totalPages,
  ];
}

export default function PaginationControls({
  currentPage,
  onPageChange,
  totalPages,
}) {
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <nav aria-label="Paginación" className="inline-flex items-center gap-1">
      <button
        aria-label="Página anterior"
        className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        ‹
      </button>
      {pageItems.map((item) =>
        typeof item === "number" ? (
          <button
            aria-current={item === currentPage ? "page" : undefined}
            className={`flex h-7 min-w-7 items-center justify-center rounded px-2 text-[0.5625rem] font-semibold ${
              item === currentPage
                ? "bg-[#0f3b9d] text-white"
                : "bg-blue-50 text-slate-700 hover:bg-blue-100"
            }`}
            key={item}
            onClick={() => onPageChange(item)}
            type="button"
          >
            {item}
          </button>
        ) : (
          <span aria-hidden="true" className="px-1 text-slate-400" key={item}>
            …
          </span>
        ),
      )}
      <button
        aria-label="Página siguiente"
        className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        ›
      </button>
    </nav>
  );
}
