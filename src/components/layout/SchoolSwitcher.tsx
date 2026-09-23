import React, { useState } from "react";
import { Building2, ChevronDown, Check, Globe, MapPin, Settings } from "lucide-react";
import { useSchool } from "../../context/SchoolContext";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface SchoolSwitcherProps {
  onPlatformSettings?: () => void;
}

export default function SchoolSwitcher({ onPlatformSettings }: SchoolSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { selectedSchool, schools, setSchoolId, agrupamento } = useSchool();
  const activeSchools = schools.filter((s) => s.active);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors max-w-[220px] text-left"
          aria-label="Selecionar escola"
        >
          <span className="w-6 h-6 rounded-full bg-primary/12 flex items-center justify-center flex-shrink-0">
            <Building2 size={13} className="text-primary" />
          </span>
          <span className="text-xs font-medium text-foreground truncate hidden sm:block">
            {selectedSchool.name}
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
        <div className="px-3 py-2.5 border-b border-border bg-muted/20">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Selecionar Escola
          </p>
          <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5 flex items-center gap-1">
            <Globe size={10} className="flex-shrink-0" />
            {agrupamento.name}
          </p>
        </div>

        <div className="py-1 max-h-72 overflow-y-auto">
          {activeSchools.map((s) => {
            const isSelected = s.id === selectedSchool.id;
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
                }`}
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
                  <p
                    className={`text-sm font-medium truncate ${
                      isSelected ? "text-primary font-semibold" : "text-foreground"
                    }`}
                  >
                    {s.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <MapPin size={9} className="flex-shrink-0" />
                    {s.address}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1.5">
                    <Check size={9} className="text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {onPlatformSettings && (
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

