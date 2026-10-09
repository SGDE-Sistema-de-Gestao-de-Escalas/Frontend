import React, { useState } from "react";
import { Building2, ChevronDown, Check, MapPin, Settings, Plus, Loader2 } from "lucide-react";
import { useSchool } from "../../context/SchoolContext";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface SchoolSwitcherProps {
  onPlatformSettings?: () => void;
}

export default function SchoolSwitcher({ onPlatformSettings }: SchoolSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { selectedSchool, schools, setSchoolId, canSwitchSchool, isLoading } = useSchool();
  const activeSchools = schools.filter((s) => s.active);
  const inactiveSchools = schools.filter((s) => !s.active);

  // Assistentes pertencem a uma escola atribuída e visualizam apenas o badge sem dropdown de seleção
  if (!canSwitchSchool) {
    return (
      <div
        className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full border border-border bg-card max-w-[220px] select-none cursor-default"
        title={selectedSchool ? `Escola atribuída: ${selectedSchool.name}` : undefined}
      >
        <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/12 text-primary">
          <Building2 size={13} />
        </span>
        <span className="text-xs font-medium text-foreground truncate hidden sm:block">
          {selectedSchool ? selectedSchool.name : "A sua escola"}
        </span>
      </div>
    );
  }

  const renderSchoolItem = (s: typeof schools[0], isInactive = false) => {
    const isSelected = selectedSchool ? s.id === selectedSchool.id : false;
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => {
          setSchoolId(s.id);
          setOpen(false);
        }}
        className={`w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left ${
          isSelected ? "bg-primary/5" : ""
        } ${isInactive ? "opacity-75 hover:opacity-100" : ""}`}
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isSelected ? "bg-primary/15" : "bg-muted"
          }`}
        >
          <Building2
            size={13}
            className={isSelected ? "text-primary" : "text-muted-foreground"}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p
              className={`text-sm font-medium truncate ${
                isSelected ? "text-primary font-semibold" : "text-foreground"
              }`}
            >
              {s.name}
            </p>
            {isInactive && (
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                Inativa
              </span>
            )}
          </div>
          {s.address && (
            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <MapPin size={9} className="flex-shrink-0" />
              {s.address}
            </p>
          )}
        </div>
        {isSelected && (
          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1.5">
            <Check size={9} className="text-primary-foreground" />
          </div>
        )}
      </button>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors max-w-[220px] text-left"
          aria-label="Selecionar escola"
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
            selectedSchool ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            {isLoading ? (
              <Loader2 size={13} className="animate-spin text-primary" />
            ) : (
              <Building2 size={13} />
            )}
          </span>
          <span className="text-xs font-medium text-foreground truncate hidden sm:block">
            {isLoading
              ? "A carregar escola..."
              : selectedSchool
              ? selectedSchool.name
              : "Nenhuma escola"}
          </span>
          <ChevronDown
            size={13}
            className={`flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-80 p-0 rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
      >
        <div className="px-3 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Selecionar Escola
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">
            {isLoading
              ? "A carregar..."
              : `${schools.length} ${schools.length === 1 ? "escola" : "escolas"}`}
          </span>
        </div>

        <div className="py-1 max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 size={18} className="animate-spin text-primary" />
              <p className="text-xs">A carregar escolas...</p>
            </div>
          ) : schools.length === 0 ? (
            <div className="p-4 text-center">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2 text-muted-foreground">
                <Building2 size={16} />
              </div>
              <p className="text-xs font-medium text-foreground">
                Nenhuma escola registada
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">
                Crie a primeira escola para começar a utilizar a plataforma.
              </p>
              {onPlatformSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onPlatformSettings();
                    setOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <Plus size={13} />
                  Criar Primeira Escola
                </button>
              )}
            </div>
          ) : (
            <>
              {activeSchools.map((s) => renderSchoolItem(s, false))}

              {inactiveSchools.length > 0 && (
                <>
                  <div className="px-3 py-1.5 mt-1 border-t border-border/60 bg-muted/30">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Escolas Inativas
                    </p>
                  </div>
                  {inactiveSchools.map((s) => renderSchoolItem(s, true))}
                </>
              )}
            </>
          )}
        </div>

        {onPlatformSettings && schools.length > 0 && (
          <div className="border-t border-border px-2 py-1.5 bg-muted/10">
            <button
              type="button"
              onClick={() => {
                onPlatformSettings();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Settings size={13} />
              Gerir escolas e plataforma
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

