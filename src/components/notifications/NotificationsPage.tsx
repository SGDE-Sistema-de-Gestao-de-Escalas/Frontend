import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Notification } from "../../types";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
} from "../../hooks/api/useNotifications";
import {
  NOTIF_FILTERS,
  NOTIF_STYLES,
  formatRelativeTime,
  type NotifFilterId,
} from "./notificationMeta";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { ActionTooltip } from "../common/ActionTooltip";
import ConfirmationModal from "../common/ConfirmationModal";
import { useSchool } from "../../context/SchoolContext";
import { notify } from "../common/FeedbackNotification";
import { cn } from "../ui/utils";

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { selectedSchool, selectedSchoolId, setSchoolId } = useSchool();
  const [schoolScope, setSchoolScope] = useState<"current" | "all">("current");
  const [filter, setFilter] = useState<NotifFilterId>("all");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Voltar à primeira página e limpar seleções sempre que os filtros mudam.
  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [filter, onlyUnread, schoolScope]);

  // Limpar seleções ao mudar de página
  useEffect(() => {
    setSelectedIds([]);
  }, [page]);

  const effectiveSchoolId =
    schoolScope === "current"
      ? (selectedSchoolId ? String(selectedSchoolId) : undefined)
      : "all";

  const { data, isLoading, isError, isFetching } = useNotificationsList({
    type: filter,
    school_id: effectiveSchoolId,
    unread: onlyUnread,
    page,
    per_page: PAGE_SIZE,
  });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();

  const items: Notification[] = data?.items ?? [];
  const counts = data?.unreadCounts;
  const globalCounts = data?.globalUnreadCounts;
  const meta = data?.meta;
  const unreadTotal = (schoolScope === "all" ? globalCounts?.all : counts?.all) ?? counts?.all ?? 0;
  const globalUnreadTotal = globalCounts?.all ?? counts?.all ?? 0;
  const currentSchoolUnread =
    selectedSchoolId && data?.unreadBySchool
      ? (data.unreadBySchool[String(selectedSchoolId)] ?? 0)
      : 0;

  const isAllCurrentPageSelected =
    items.length > 0 && items.every((n) => selectedIds.includes(n.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleToggleSelectAll() {
    if (isAllCurrentPageSelected) {
      const pageIds = items.map((n) => n.id);
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = items.map((n) => n.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  }

  async function handleBulkMarkRead() {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => markRead.mutateAsync(id)));
      notify.success(
        `${selectedIds.length} ${
          selectedIds.length === 1
            ? "notificação marcada como lida"
            : "notificações marcadas como lidas"
        }.`
      );
      setSelectedIds([]);
    } catch {
      notify.error("Ocorreu um erro ao marcar as notificações como lidas.");
    }
  }

  async function handleBulkDeleteConfirm() {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => remove.mutateAsync(id)));
      notify.success(
        `${selectedIds.length} ${
          selectedIds.length === 1
            ? "notificação eliminada"
            : "notificações eliminadas"
        }.`
      );
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    } catch {
      notify.error("Ocorreu um erro ao eliminar as notificações.");
    }
  }

  function open(n: Notification) {
    if (!n.read) markRead.mutate(n.id);
    if (n.schoolId && String(n.schoolId) !== String(selectedSchoolId)) {
      setSchoolId(n.schoolId);
    }
    if (n.link) navigate(n.link);
  }

  const activeFilterMeta = NOTIF_FILTERS.find((f) => f.id === filter);
  const filterLabel = activeFilterMeta?.label || "esta categoria";

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Bell size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Notificações
              </h1>
              {unreadTotal > 0 && (
                <Badge
                  variant="destructive"
                  className="font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold"
                >
                  {unreadTotal} por ler
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alertas operacionais e avisos do sistema para{" "}
              <span className="font-medium text-foreground">
                {selectedSchool?.name || "selecionada"}
              </span>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              markAllRead.mutate(filter === "all" ? undefined : filter)
            }
            disabled={unreadTotal === 0 || markAllRead.isPending}
            className="text-xs"
          >
            {markAllRead.isPending ? (
              <Loader2 size={13} className="mr-1.5 animate-spin" />
            ) : (
              <CheckCheck size={14} className="mr-1.5 text-primary" />
            )}
            {filter === "all"
              ? "Marcar todas como lidas"
              : `Marcar ${filterLabel.toLowerCase()} como lidas`}
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Controlos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-2 rounded-xl border border-border shadow-2xs">
        {/* Seletor Escola Atual vs Todas */}
        <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/50 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setSchoolScope("current")}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer",
              schoolScope === "current"
                ? "bg-card text-foreground shadow-xs font-semibold border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="truncate max-w-[150px]">{selectedSchool?.name || "Escola Atual"}</span>
            {currentSchoolUnread > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">
                {currentSchoolUnread}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSchoolScope("all")}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer",
              schoolScope === "all"
                ? "bg-card text-foreground shadow-xs font-semibold border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Todas as Escolas</span>
            {globalUnreadTotal > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">
                {globalUnreadTotal}
              </span>
            )}
          </button>
        </div>
        {/* Pills de Categoria */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none p-0.5">
          {NOTIF_FILTERS.map((f) => {
            const count = counts?.[f.id] ?? 0;
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer select-none",
                  active
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <span>{f.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                      active
                        ? "bg-white/20 text-white font-bold"
                        : "bg-muted text-muted-foreground font-semibold"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Checkbox Apenas Não Lidas */}
        <div className="flex items-center gap-2 px-3 py-1 shrink-0">
          <Checkbox
            id="notif-only-unread"
            checked={onlyUnread}
            onCheckedChange={(c) => setOnlyUnread(Boolean(c))}
          />
          <label
            htmlFor="notif-only-unread"
            className="text-xs font-medium text-foreground cursor-pointer select-none"
          >
            Apenas não lidas
          </label>
        </div>
      </div>

      {/* Barra de Ações em Lote */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-xs text-foreground animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Badge
              variant="default"
              className="text-[11px] font-mono font-bold"
            >
              {selectedIds.length}
            </Badge>
            <span className="font-medium text-foreground">
              {selectedIds.length === 1
                ? "notificação selecionada"
                : "notificações selecionadas"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBulkMarkRead}
              disabled={markRead.isPending}
              className="h-7 text-xs bg-card"
            >
              <CheckCheck size={13} className="mr-1.5 text-primary" />
              Marcar lidas
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowBulkDeleteModal(true)}
              disabled={remove.isPending}
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 bg-card border-destructive/30"
            >
              <Trash2 size={13} className="mr-1.5" />
              Eliminar
            </Button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 transition-colors cursor-pointer"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Notificações */}
      <Card className="border-border bg-card overflow-hidden shadow-xs">
        {/* Cabeçalho da Lista */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="select-all-page"
              checked={isAllCurrentPageSelected}
              onCheckedChange={handleToggleSelectAll}
              disabled={items.length === 0}
              aria-label="Selecionar todas nesta página"
            />
            <label
              htmlFor="select-all-page"
              className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Selecionar todas nesta página
            </label>
          </div>

          {meta && (
            <span className="text-[11px] font-mono text-muted-foreground">
              {meta.total} {meta.total === 1 ? "notificação" : "notificações"}
            </span>
          )}
        </div>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2.5 text-muted-foreground">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="text-xs">A carregar notificações...</span>
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-destructive">
            Não foi possível carregar as notificações. Tente novamente mais tarde.
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border flex items-center justify-center mx-auto text-muted-foreground/60">
              <Inbox size={24} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                {onlyUnread ? "Sem notificações por ler" : "Sem notificações"}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {onlyUnread
                  ? "Estás a par de todas as atualizações nesta categoria."
                  : "Não existem alertas ou registos de notificação para a escola selecionada."}
              </p>
            </div>
            {onlyUnread && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOnlyUnread(false)}
                className="text-xs mt-1"
              >
                Ver todas as notificações
              </Button>
            )}
          </div>
        ) : (
          <ul
            className={cn(
              "divide-y divide-border/60",
              isFetching ? "opacity-75" : ""
            )}
          >
            {items.map((n) => {
              const style = NOTIF_STYLES[n.type];
              const isSelected = selectedIds.includes(n.id);

              return (
                <li
                  key={n.id}
                  className={cn(
                    "group relative flex items-start gap-3.5 px-4 py-3.5 transition-colors",
                    !n.read
                      ? "bg-primary/[0.03] border-l-2 border-l-primary"
                      : "hover:bg-muted/20 border-l-2 border-l-transparent",
                    isSelected ? "bg-primary/[0.06]" : ""
                  )}
                >
                  {/* Checkbox de seleção */}
                  <div className="pt-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(n.id)}
                      aria-label={`Selecionar notificação: ${n.title}`}
                    />
                  </div>

                  {/* Ícone de Categoria */}
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5",
                      style.iconBg
                    )}
                  >
                    {style.icon}
                  </div>

                  {/* Corpo Clicável */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => open(n)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-sm tracking-tight",
                          !n.read
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/80"
                        )}
                      >
                        {n.title}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium uppercase tracking-wider py-0 px-1.5 text-muted-foreground border-border/80"
                      >
                        {style.label}
                      </Badge>
                      {n.schoolName && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-normal py-0 px-1.5 text-muted-foreground border-border/60 max-w-[160px] truncate"
                        >
                          {n.schoolName}
                        </Badge>
                      )}
                      {!n.read && (
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            style.dot
                          )}
                          title="Não lida"
                        />
                      )}
                      <span className="text-xs text-muted-foreground/70 ml-auto font-mono shrink-0">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {n.body}
                      </p>
                    )}

                    {n.link && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium hover:underline mt-1.5">
                        Ver detalhes <ArrowRight size={12} />
                      </span>
                    )}
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    {!n.read && (
                      <ActionTooltip content="Marcar como lida">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead.mutate(n.id);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <CheckCheck size={15} />
                        </button>
                      </ActionTooltip>
                    )}
                    <ActionTooltip content="Eliminar notificação">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove.mutate(n.id);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </ActionTooltip>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Rodapé de Paginação */}
        {meta && meta.lastPage > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-muted/10 border-t border-border text-xs text-muted-foreground flex-wrap gap-2">
            <span>
              Página <strong className="text-foreground">{meta.currentPage}</strong> de{" "}
              <strong className="text-foreground">{meta.lastPage}</strong> · Total de{" "}
              <strong className="text-foreground">{meta.total}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-2.5 text-xs"
              >
                <ChevronLeft size={14} className="mr-1" /> Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
                disabled={page >= meta.lastPage}
                className="h-8 px-2.5 text-xs"
              >
                Seguinte <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Confirmação para Eliminação em Lote */}
      <ConfirmationModal
        open={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Eliminar Notificações Selecionadas"
        description={
          <>
            Tem a certeza de que pretende eliminar{" "}
            <strong>
              {selectedIds.length}{" "}
              {selectedIds.length === 1
                ? "notificação selecionada"
                : "notificações selecionadas"}
            </strong>
            ? Esta ação é irreversível.
          </>
        }
        confirmLabel="Eliminar Notificações"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={remove.isPending}
      />
    </div>
  );
}
