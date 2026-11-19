import { useEffect, useState } from "react";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            Equipa de Assistentes
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {counts.all} assistentes registados em {selectedSchool.name}
            {isFetching && !isLoading && (
              <Loader2 size={12} className="animate-spin text-primary" />
            )}
          </p>
        </div>

        {/* Botão de Adicionar Assistente */}
        <Button
          type="button"
          size="sm"
          onClick={onAddNew}
          className="gap-1.5 h-9 text-xs shadow-xs w-full sm:w-auto shrink-0 cursor-pointer"
        >
          <UserPlus size={14} />
          <span>Adicionar Assistente</span>
        </Button>
      </div>

      {/* Tabs com Contadores do Backend */}
      <div className="flex gap-px border-b border-border overflow-x-auto no-scrollbar flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
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
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 whitespace-nowrap cursor-pointer ${
              tab === t.id
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${t.color} shrink-0`} />
            <span>{t.label}</span>
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
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botão de Exportar CSV */}
            <ActionTooltip content="Exportar assistentes para ficheiro CSV">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={exportMutation.isPending}
                className="h-8 px-2.5 text-xs gap-1.5 border-border bg-card/60 hover:bg-muted text-foreground transition-colors shadow-xs cursor-pointer shrink-0"
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
                className="h-8 px-2.5 text-xs gap-1.5 border-border bg-card/60 hover:bg-muted text-foreground transition-colors shadow-xs cursor-pointer shrink-0"
              >
                <FileSpreadsheet size={13} className="text-muted-foreground" />
                <span className="hidden sm:inline">Importar CSV</span>
                <span className="sm:hidden">Importar</span>
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
          <Card className="overflow-hidden border-border bg-card gap-0 shadow-xs">
            {/* Table header (apenas em ecrãs >= sm) */}
            <div className="hidden sm:grid sm:grid-cols-[2.5fr_2fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/20">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Nome & Nº Mecanográfico
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Contacto
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
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
                className={`w-full p-3.5 sm:px-4 sm:py-3 text-left transition-colors hover:bg-muted/40 group cursor-pointer ${
                  i !== assistants.length - 1 ? "border-b border-border/50" : ""
                } ${tab === "inativos" ? "opacity-60 hover:opacity-90" : ""}`}
              >
                {/* Vista Mobile (< sm): Layout compacto, rico em detalhes com nome completo, mecanográfico, contacto e badge */}
                <div className="flex sm:hidden items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        tab === "ativos" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span className="text-xs font-bold font-mono">
                        {a.initials ||
                          `${a.first_name?.[0] || ""}${a.last_name?.[0] || ""}`.toUpperCase() ||
                          "AS"}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {a.name || `${a.first_name || ""} ${a.last_name || ""}`.trim()}
                        </span>
                        {(a.internal_number || a.mecanografico || a.staffNumber) && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                            {a.internal_number || a.mecanografico || a.staffNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
                        <span className="truncate">{a.email || "Sem email"}</span>
                        {a.phone && a.phone !== "-" && (
                          <span className="shrink-0 font-mono text-[10px] text-muted-foreground/80">
                            · {a.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {a.deleted_at ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        Eliminado
                      </span>
                    ) : a.is_anonymized ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                        Anonimizado
                      </span>
                    ) : !(a.active ?? a.is_active ?? true) ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Inativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        Ativo
                      </span>
                    )}
                    <ChevronRight
                      size={15}
                      className="text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0"
                    />
                  </div>
                </div>

                {/* Vista Desktop (>= sm): Grid tabular com 4 colunas */}
                <div className="hidden sm:grid sm:grid-cols-[2.5fr_2fr_1fr_auto] gap-4 items-center w-full">
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

                  <div className="truncate text-xs text-muted-foreground">
                    <span className="block truncate">{a.email || "—"}</span>
                    {a.phone && a.phone !== "-" && (
                      <span className="block text-[10px] text-muted-foreground/80 font-mono">
                        {a.phone}
                      </span>
                    )}
                  </div>

                  <span className="flex items-center gap-1.5">
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
                    className="text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                  />
                </div>
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
