import React, { useMemo, useState } from "react";
import { ChevronRight, Loader2, SearchX, UserPlus, Users } from "lucide-react";
import { Card } from "../ui/card";
import type { EntityId } from "../../types";
import { useAssistantsList } from "../../hooks/api/useAssistants";
import { useSchool } from "../../context/SchoolContext";
import ListToolbar from "../common/ListToolbar";
import ListPagination from "../common/ListPagination";

interface AssistantsListPageProps {
  onAddNew: () => void;
  onViewProfile: (id?: EntityId) => void;
}

export default function AssistantsListPage({
  onAddNew,
  onViewProfile,
}: AssistantsListPageProps) {
  const [tab, setTab] = useState<"ativos" | "inativos">("ativos");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { selectedSchool } = useSchool();
  // Muda automaticamente quando se troca de escola no header (schoolId na queryKey).
  const { data: assistants = [], isLoading, isFetching } = useAssistantsList({ status: "all" });
  const active = assistants.filter((a) => !a.deleted_at && (a.active ?? a.is_active ?? true));
  const inactive = assistants.filter((a) => a.deleted_at || !(a.active ?? a.is_active ?? true));
  const baseList = tab === "ativos" ? active : inactive;

  // Filtragem e ordenação em memória (preparado para backend pagination)
  const filteredList = useMemo(() => {
    let result = baseList;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((a) => {
        const fullName = (a.name || `${a.first_name || ""} ${a.last_name || ""}`).toLowerCase();
        const num = (a.internal_number || a.mecanografico || a.staffNumber || "").toLowerCase();
        const exc = (a.exception || "").toLowerCase();
        return fullName.includes(q) || num.includes(q) || exc.includes(q);
      });
    }

    return [...result].sort((a, b) => {
      const nameA = (a.name || `${a.first_name || ""} ${a.last_name || ""}`).trim().toLowerCase();
      const nameB = (b.name || `${b.first_name || ""} ${b.last_name || ""}`).trim().toLowerCase();
      if (sortBy === "name-asc") return nameA.localeCompare(nameB);
      if (sortBy === "name-desc") return nameB.localeCompare(nameA);
      if (sortBy === "number-asc") {
        const numA = (a.internal_number || a.mecanografico || a.staffNumber || "").toLowerCase();
        const numB = (b.internal_number || b.mecanografico || b.staffNumber || "").toLowerCase();
        return numA.localeCompare(numB);
      }
      return 0;
    });
  }, [baseList, search, sortBy]);

  // Paginação
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const handleTabChange = (newTab: "ativos" | "inativos") => {
    setTab(newTab);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Equipa de Assistentes
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {assistants.length} assistentes registados em {selectedSchool.name}
            {isFetching && !isLoading && (
              <Loader2 size={12} className="animate-spin" />
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNew}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
        >
          <UserPlus size={14} />
          Adicionar Assistente
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-px border-b border-border">
        {(
          [
            {
              id: "ativos" as const,
              label: "Ativos",
              count: active.length,
              color: "bg-[#0E7C59]",
            },
            {
              id: "inativos" as const,
              label: "Inativos e Eliminados",
              count: inactive.length,
              color: "bg-muted-foreground",
            },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabChange(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${t.color}`} />
            {t.label}
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                tab === t.id
                  ? "bg-primary/10 text-primary font-bold"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar: Pesquisa e Ordenação */}
      {baseList.length > 0 && (
        <ListToolbar
          search={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Pesquisar por nome, nº mecanográfico..."
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { label: "Nome (A-Z)", value: "name-asc" },
            { label: "Nome (Z-A)", value: "name-desc" },
            { label: "Nº Mecanográfico", value: "number-asc" },
          ]}
        />
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">A carregar assistentes...</span>
        </div>
      ) : baseList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Nenhum assistente nesta categoria para esta escola</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
          <SearchX size={30} className="mb-2 opacity-40 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nenhum assistente encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Não foram encontrados resultados para a pesquisa «{search}».
          </p>
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="mt-3 text-xs text-primary font-medium hover:underline"
          >
            Limpar pesquisa
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden border-border bg-card gap-0">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/20">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Nome
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:block">
                Observação / Exceção
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:block">
                Estado
              </span>
              <span />
            </div>
            {paginatedList.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onViewProfile(a.id)}
                className={`w-full grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-4 py-3 items-center text-left transition-colors hover:bg-muted/40 group ${
                  i !== paginatedList.length - 1 ? "border-b border-border/50" : ""
                } ${tab === "inativos" ? "opacity-60 hover:opacity-90" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tab === "ativos" ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold font-mono ${
                        tab === "ativos"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {a.initials || `${a.first_name?.[0] || ""}${a.last_name?.[0] || ""}`.toUpperCase() || "AS"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate block">
                      {a.name || `${a.first_name || ""} ${a.last_name || ""}`.trim()}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {a.internal_number || a.mecanografico || a.staffNumber || "—"}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground hidden sm:block truncate">
                  {a.exception ?? "—"}
                </span>
                <span className="hidden sm:flex items-center gap-1.5">
                  {a.deleted_at ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        Eliminado
                      </span>
                    </>
                  ) : !(a.active ?? a.is_active ?? true) ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Inativo
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C59]" />
                      <span className="text-xs text-muted-foreground">Ativo</span>
                    </>
                  )}
                </span>
                <ChevronRight
                  size={14}
                  className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                />
              </button>
            ))}
          </Card>

          {/* Paginação */}
          <ListPagination
            currentPage={currentPage}
            totalItems={filteredList.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}

