import React from "react";
import { ArrowDownUp, Search, X } from "lucide-react";
import CustomSelect from "./CustomSelect";

export interface SortOption {
  label: string;
  value: string;
}

export interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sortValue?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: SortOption[];
  extraFilters?: React.ReactNode;
  className?: string;
}

export default function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Pesquisar...",
  sortValue,
  onSortChange,
  sortOptions,
  extraFilters,
  className = "",
}: ListToolbarProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${className}`}
    >
      {/* Campo de Pesquisa */}
      <div className="relative flex-1 sm:max-w-xs">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-border bg-card/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors shadow-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Limpar pesquisa"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Controles da Direita: Filtros extras + Ordenação */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {extraFilters}

        {sortOptions && sortOptions.length > 0 && onSortChange && (
          <div className="flex items-center gap-1.5 min-w-[160px]">
            <ArrowDownUp size={13} className="text-muted-foreground flex-shrink-0" />
            <CustomSelect
              value={sortValue}
              onValueChange={onSortChange}
              options={sortOptions}
              size="sm"
              className="flex-1"
              triggerClassName="h-8 bg-card/60 text-xs py-1 px-2.5 rounded-lg border-border"
            />
          </div>
        )}
      </div>
    </div>
  );
}

