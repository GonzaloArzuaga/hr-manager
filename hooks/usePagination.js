import { useEffect, useState } from "react";

export function usePagination(items, pageSize) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);

  return {
    currentPage,
    endIndex: startIndex + pageItems.length,
    pageItems,
    setPage,
    startIndex,
    totalPages,
  };
}
