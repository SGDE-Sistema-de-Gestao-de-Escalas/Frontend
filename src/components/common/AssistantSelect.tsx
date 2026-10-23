import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Check, ChevronDown, X, Users, UserCheck, UserX } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";
import type { Assistant } from "../../types";

export interface AssistantSelectProps {
  value?: string;
  onChange: (value: string, assistant?: Assistant) => void;
  assistants: Assistant[];
  includeAllOption?: boolean;
  allOptionLabel?: string;
  placeholder?: string;
  size?: "sm" | "default";
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}

export function isAssistantActive(assistant: Assistant): boolean {
  if (assistant.deleted_at) return false;
  if (assistant.active !== undefined) return Boolean(assistant.active);
  if (assistant.is_active !== undefined) return Boolean(assistant.is_active);
  return true;
}

export function getAssistantInitials(name: string, fallback?: string): string {
  if (fallback) return fallback;
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "AS";
}

export default function AssistantSelect({
  value,
  onChange,
  assistants,
  includeAllOption = false,
  allOptionLabel = "Todos os Assistentes",
  placeholder = "Selecionar assistente...",
  size = "default",
  disabled = false,
  hasError = false,
  className,
}: AssistantSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco no input de pesquisa assim que o popover abre
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [open]);

  // Separar assistentes em Ativos e Inativos (ordenados alfabeticamente)
  const { activeAssistants, inactiveAssistants } = useMemo(() => {
    const active: Assistant[] = [];
    const inactive: Assistant[] = [];

    assistants.forEach((a) => {
      if (isAssistantActive(a)) {
        active.push(a);
      } else {
        inactive.push(a);
      }
    });

    const sortFn = (a: Assistant, b: Assistant) => (a.name || "").localeCompare(b.name || "");
    return {
      activeAssistants: active.sort(sortFn),
      inactiveAssistants: inactive.sort(sortFn),
    };
  }, [assistants]);

  // Filtragem por termo de pesquisa
  const normalizedSearch = search.trim().toLowerCase();

  const filteredActive = useMemo(() => {
    if (!normalizedSearch) return activeAssistants;
    return activeAssistants.filter((a) => {
      const nameMatch = a.name?.toLowerCase().includes(normalizedSearch);
      const emailMatch = a.email?.toLowerCase().includes(normalizedSearch);
      const numberMatch =
        a.internal_number?.toLowerCase().includes(normalizedSearch) ||
        a.staffNumber?.toLowerCase().includes(normalizedSearch) ||
        a.mecanografico?.toLowerCase().includes(normalizedSearch);
      return nameMatch || emailMatch || numberMatch;
    });
  }, [activeAssistants, normalizedSearch]);

  const filteredInactive = useMemo(() => {
    if (!normalizedSearch) return inactiveAssistants;
    return inactiveAssistants.filter((a) => {
      const nameMatch = a.name?.toLowerCase().includes(normalizedSearch);
      const emailMatch = a.email?.toLowerCase().includes(normalizedSearch);
      const numberMatch =
        a.internal_number?.toLowerCase().includes(normalizedSearch) ||
        a.staffNumber?.toLowerCase().includes(normalizedSearch) ||
        a.mecanografico?.toLowerCase().includes(normalizedSearch);
      return nameMatch || emailMatch || numberMatch;
    });
  }, [inactiveAssistants, normalizedSearch]);

  const totalResults =
    (includeAllOption && (!normalizedSearch || allOptionLabel.toLowerCase().includes(normalizedSearch)) ? 1 : 0) +
    filteredActive.length +
    filteredInactive.length;

  // Assistente atualmente selecionado
  const selectedAssistant = useMemo(() => {
    if (!value || value === "all") return null;
    return assistants.find((a) => String(a.id) === String(value)) || null;
  }, [value, assistants]);

  const isSelectedInactive = selectedAssistant ? !isAssistantActive(selectedAssistant) : false;

  const handleSelect = (val: string, assistant?: Assistant) => {
    onChange(val, assistant);
    setOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-expanded={open}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-input-background px-3 text-left transition-colors outline-none",
              "focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring",
              "disabled:cursor-not-allowed disabled:opacity-50 shadow-xs cursor-pointer",
              size === "sm" ? "h-8 py-1 text-xs" : "h-9 py-2 text-xs sm:text-sm",
              hasError && "!border-destructive focus:!ring-destructive focus:!border-destructive"
            )}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
              {value === "all" ? (
                <>
                  <Users className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground truncate">{allOptionLabel}</span>
                </>
              ) : selectedAssistant ? (
                <>
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      isSelectedInactive
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    {getAssistantInitials(selectedAssistant.name, selectedAssistant.initials)}
                  </span>
                  <span
                    className={cn(
                      "truncate font-medium",
                      isSelectedInactive ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {selectedAssistant.name}
                  </span>
                  {isSelectedInactive && (
                    <span className="shrink-0 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Inativo
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground truncate">{placeholder}</span>
              )}
            </div>

            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground opacity-70 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[calc(var(--radix-popover-trigger-width))] min-w-[280px] max-w-[420px] p-0 rounded-xl border border-border bg-popover shadow-xl overflow-hidden z-50"
        >
          {/* Campo de Pesquisa */}
          <div className="p-2 border-b border-border bg-muted/10 flex items-center gap-2">
            <Search className="size-3.5 text-muted-foreground shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome, nº ou email..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none border-none py-1 focus:ring-0"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Limpar pesquisa"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Lista com Grupos */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-2">
            {/* Opção "Todos os Assistentes" se aplicável */}
            {includeAllOption && (!normalizedSearch || allOptionLabel.toLowerCase().includes(normalizedSearch)) && (
              <div className="mb-1">
                <button
                  type="button"
                  onClick={() => handleSelect("all")}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-left transition-colors cursor-pointer",
                    value === "all"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted font-medium"
                  )}
                >
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Users className="size-3.5" />
                  </div>
                  <span className="flex-1 truncate">{allOptionLabel}</span>
                  {value === "all" && <Check className="size-3.5 text-primary shrink-0 stroke-[2.5]" />}
                </button>
              </div>
            )}

            {/* Grupo 1: Assistentes Ativos */}
            {filteredActive.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="size-3" />
                    Ativos ({filteredActive.length})
                  </span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {filteredActive.map((assistant) => {
                    const isSelected = String(value) === String(assistant.id);
                    return (
                      <button
                        key={String(assistant.id)}
                        type="button"
                        onClick={() => handleSelect(String(assistant.id), assistant)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-left transition-colors cursor-pointer",
                          isSelected
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted font-medium"
                        )}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                          {getAssistantInitials(assistant.name, assistant.initials)}
                        </span>
                        <div className="flex-1 min-w-0 truncate">
                          <p className="truncate leading-tight">{assistant.name}</p>
                          {(assistant.internal_number || assistant.staffNumber) && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              Nº {assistant.internal_number || assistant.staffNumber}
                            </p>
                          )}
                        </div>
                        {isSelected && <Check className="size-3.5 text-primary shrink-0 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Separador se existirem ambos os grupos */}
            {filteredActive.length > 0 && filteredInactive.length > 0 && (
              <div className="my-1 border-t border-border" />
            )}

            {/* Grupo 2: Assistentes Inativos */}
            {filteredInactive.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <UserX className="size-3" />
                    Inativos ({filteredInactive.length})
                  </span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {filteredInactive.map((assistant) => {
                    const isSelected = String(value) === String(assistant.id);
                    return (
                      <button
                        key={String(assistant.id)}
                        type="button"
                        onClick={() => handleSelect(String(assistant.id), assistant)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-left transition-colors cursor-pointer",
                          isSelected
                            ? "bg-amber-500/10 text-foreground font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                        )}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-[11px] font-medium opacity-80">
                          {getAssistantInitials(assistant.name, assistant.initials)}
                        </span>
                        <div className="flex-1 min-w-0 truncate">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate leading-tight">{assistant.name}</p>
                            <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Inativo
                            </span>
                          </div>
                          {(assistant.internal_number || assistant.staffNumber) && (
                            <p className="text-[10px] text-muted-foreground/75 truncate">
                              Nº {assistant.internal_number || assistant.staffNumber}
                            </p>
                          )}
                        </div>
                        {isSelected && <Check className="size-3.5 text-primary shrink-0 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mensagem quando não há resultados */}
            {totalResults === 0 && (
              <div className="py-6 px-3 text-center">
                <p className="text-xs font-medium text-foreground">Nenhum assistente encontrado</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Nenhum resultado para "{search}"
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

