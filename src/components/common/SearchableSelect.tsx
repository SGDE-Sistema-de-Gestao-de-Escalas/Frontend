import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  color?: string;
  description?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  size?: "sm" | "default";
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Selecionar...",
  searchPlaceholder = "Pesquisar...",
  emptyMessage = "Nenhum resultado encontrado.",
  size = "default",
  disabled = false,
  hasError = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco no input de pesquisa ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [open]);

  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value)) || null;
  }, [value, options]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) return options;
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(normalizedSearch);
      const matchDesc = opt.description?.toLowerCase().includes(normalizedSearch);
      return matchLabel || matchDesc;
    });
  }, [options, normalizedSearch]);

  const handleSelect = (val: string) => {
    onChange(val);
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
              {selectedOption ? (
                <>
                  {selectedOption.color && (
                    <span
                      className="size-3 rounded-xs shrink-0"
                      style={{ backgroundColor: selectedOption.color }}
                    />
                  )}
                  <span className="truncate font-medium text-foreground">
                    {selectedOption.label}
                  </span>
                  {selectedOption.description && (
                    <span className="text-xs text-muted-foreground truncate">
                      ({selectedOption.description})
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
          className="w-[calc(var(--radix-popover-trigger-width))] min-w-[240px] max-w-[420px] p-0 rounded-xl border border-border bg-popover shadow-xl overflow-hidden z-50"
        >
          {/* Campo de Pesquisa */}
          <div className="p-2 border-b border-border bg-muted/10 flex items-center gap-2">
            <Search className="size-3.5 text-muted-foreground shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
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

          {/* Lista de Opções (Sem grupos) */}
          <div className="max-h-60 overflow-y-auto py-1 divide-y divide-border/20">
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);

                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer",
                      "hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-40",
                      isSelected
                        ? "bg-primary/5 text-primary font-medium"
                        : "text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                      {opt.color && (
                        <span
                          className="size-3 rounded-xs shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                      )}
                      <span className="truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          ({opt.description})
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="size-4 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

