import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CustomSelect from "./CustomSelect";

export interface ListPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export default function ListPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className = "",
}: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const from = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const to = Math.min(safeCurrentPage * pageSize, totalItems);

  // Gerar lista de páginas com truncagem inteligente
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("ellipsis");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 px-1 text-xs text-muted-foreground ${className}`}
    >
      <div className="flex items-center gap-3">
        <span>
          A mostrar <strong className="font-medium text-foreground">{from}</strong> a{" "}
          <strong className="font-medium text-foreground">{to}</strong> de{" "}
          <strong className="font-medium text-foreground">{totalItems}</strong> registos
        </span>

        {onPageSizeChange && totalItems > pageSizeOptions[0] && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Por pág.:</span>
            <CustomSelect
              value={String(pageSize)}
              onValueChange={(val) => {
                onPageSizeChange(Number(val));
                onPageChange(1);
              }}
              options={pageSizeOptions.map((opt) => ({
                value: String(opt),
                label: String(opt),
              }))}
              size="sm"
              className="w-16"
              triggerClassName="h-7 text-xs px-2 py-0.5 rounded-md border-border bg-card"
            />
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-card text-xs font-medium hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
            title="Página anterior"
          >
            <ChevronLeft size={13} />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <div className="flex items-center gap-1 px-1">
            {getPageNumbers().map((p, idx) =>
              p === "ellipsis" ? (
                <span key={`ell-${idx}`} className="px-1 text-muted-foreground text-xs">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-medium transition-colors ${
                    safeCurrentPage === p
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "border border-border bg-card text-foreground hover:bg-muted shadow-xs"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPages}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-card text-xs font-medium hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
            title="Página seguinte"
          >
            <span className="hidden sm:inline">Seguinte</span>
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

