import React, { useEffect, useState } from "react";
import {
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  SearchX,
  UserPlus,
  Users,
} from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { EntityId } from "../../types";
import {
  useAssistantsPaginated,
  useExportAssistantsCsv,
} from "../../hooks/api/useAssistants";
import { useSchool } from "../../context/SchoolContext";
import ListToolbar from "../common/ListToolbar";
import ListPagination from "../common/ListPagination";
import ImportAssistantsModal from "./ImportAssistantsModal";
import ActionTooltip from "../common/ActionTooltip";

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const { selectedSchool, selectedSchoolId } = useSchool();
  const exportMutation = useExportAssistantsCsv();

  // Resetar pesquisa e página ao trocar de escola
  useEffect(() => {
    setSearch("");
    setDebouncedSearch("");
    setCurrentPage(1);
    setTab("ativos");
    setIsImportModalOpen(false);
  }, [selectedSchoolId]);

  // Debounce da pesquisa para não sobrecarregar a API a cada tecla (2 segundos)
  useEffect(() => {
    if (search.trim() === "") {
      setDebouncedSearch("");
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 1000);

    return () => clearTimeout(handler);
  }, [search]);

  // Conversão da ordenação para os parâmetros do backend
  const sort_by = sortBy.startsWith("number") ? "internal_number" : "name";
  const sort_direction = sortBy.endsWith("desc") ? "desc" : "asc";

  // Pedido paginado e filtrado ao backend
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useAssistantsPaginated({
    page: currentPage,
    per_page: pageSize,
    status: tab === "ativos" ? "active" : "inactive",
    search: debouncedSearch.trim() || undefined,
    sort_by,
    sort_direction,
  });

  const assistants = data?.items ?? [];
  const counts = data?.counts ?? { all: 0, active: 0, inactive: 0 };
  const totalItems = data?.total ?? 0;

  const handleTabChange = (newTab: "ativos" | "inativos") => {
    setTab(newTab);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleSortChange = (val: string) => {
    setSortBy(val);
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    exportMutation.mutate(tab === "ativos" ? "active" : "all");
  };

  return (
    <div className="space-y-6">
      {/* Header com Ação Principal */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Equipa de Assistentes
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {counts.all} assistentes registados em {selectedSchool.name}
            {isFetching && !isLoading && (
              <Loader2 size={12} className="animate-spin text-primary" />
            )}
          </p>
        </div>

        {/* Botão de Adicionar Assistente com destaque principal */}
        <Button
          type="button"
          size="sm"
          onClick={onAddNew}
          className="gap-1.5 h-9 text-xs shadow-xs ml-auto"
        >
          <UserPlus size={14} />
          <span>Adicionar Assistente</span>
        </Button>
      </div>

      {/* Tabs com Contadores do Backend */}
      <div className="flex gap-px border-b border-border">
        {(
          [
            {
              id: "ativos" as const,
              label: "Ativos",
              count: counts.active,
              color: "bg-[#0E7C59]",
            },
            {
              id: "inativos" as const,
              label: "Inativos e Eliminados",
              count: counts.inactive,
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

      {/* Toolbar: Pesquisa, Ações de CSV e Ordenação no mesmo nível */}
      <ListToolbar
        search={search}
        onSearchChange={handleSearchChange}
        onSearchSubmit={() => setDebouncedSearch(search)}
        searchPlaceholder="Pesquisar por nome, nº mecanográfico, email..."
        sortValue={sortBy}
        onSortChange={handleSortChange}
        sortOptions={[
          { label: "Nome (A-Z)", value: "name-asc" },
          { label: "Nome (Z-A)", value: "name-desc" },
          { label: "Nº Mecanográfico (asc)", value: "number-asc" },
          { label: "Nº Mecanográfico (desc)", value: "number-desc" },
        ]}
        extraFilters={
          <div className="flex items-center gap-1.5">
            {/* Botão de Exportar CSV */}
            <ActionTooltip content="Exportar assistentes para ficheiro CSV">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={exportMutation.isPending}
                className="h-8 px-2.5 text-xs gap-1.5 border-border bg-card/60 hover:bg-muted text-foreground transition-colors shadow-xs cursor-pointer"
              >
                {exportMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin text-muted-foreground" />
                ) : (
                  <Download size={13} className="text-muted-foreground" />
                )}
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </ActionTooltip>

            {/* Botão de Importar CSV */}
            <ActionTooltip content="Importar assistentes a partir de ficheiro CSV">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(true)}
                className="h-8 px-2.5 text-xs gap-1.5 border-border bg-card/60 hover:bg-muted text-foreground transition-colors shadow-xs cursor-pointer"
              >
                <FileSpreadsheet size={13} className="text-muted-foreground" />
                <span>Importar CSV</span>
              </Button>
            </ActionTooltip>
          </div>
        }
      />

      {/* Listagem */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2 text-primary" />
          <span className="text-sm">A carregar assistentes...</span>
        </div>
      ) : assistants.length === 0 && !debouncedSearch ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Nenhum assistente nesta categoria para esta escola</p>
        </div>
      ) : assistants.length === 0 && debouncedSearch ? (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
          <SearchX size={30} className="mb-2 opacity-40 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nenhum assistente encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Não foram encontrados resultados para a pesquisa «{debouncedSearch}».
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
                Contacto / Observação
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:block">
                Estado
              </span>
              <span />
            </div>

            {/* Linhas */}
            {assistants.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onViewProfile(a.id)}
                className={`w-full grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-4 py-3 items-center text-left transition-colors hover:bg-muted/40 group ${
                  i !== assistants.length - 1 ? "border-b border-border/50" : ""
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
                      {a.initials ||
                        `${a.first_name?.[0] || ""}${a.last_name?.[0] || ""}`.toUpperCase() ||
                        "AS"}
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

                <div className="hidden sm:block truncate text-xs text-muted-foreground">
                  <span className="block truncate">{a.email || "—"}</span>
                  {a.phone && a.phone !== "-" && (
                    <span className="block text-[10px] text-muted-foreground/80 font-mono">
                      {a.phone}
                    </span>
                  )}
                </div>

                <span className="hidden sm:flex items-center gap-1.5">
                  {a.deleted_at ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        Eliminado
                      </span>
                    </>
                  ) : a.is_anonymized ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span className="text-xs text-muted-foreground font-medium">
                        Anonimizado
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

          {/* Paginação do Servidor */}
          <ListPagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Modal de Importação CSV */}
      <ImportAssistantsModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
