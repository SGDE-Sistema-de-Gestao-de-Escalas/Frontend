import React from "react";
import { Building2, Plus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NoSchoolPlaceholderProps {
  title?: string;
  description?: string;
  moduleName?: string;
}

export default function NoSchoolPlaceholder({
  title,
  description,
  moduleName,
}: NoSchoolPlaceholderProps) {
  const navigate = useNavigate();

  const defaultTitle = moduleName
    ? `Nenhuma escola disponível para ${moduleName}`
    : "Nenhuma escola registada na plataforma";

  const defaultDescription = moduleName
    ? `Para aceder e configurar ${moduleName.toLowerCase()}, é necessário ter pelo menos uma escola registada e ativa no sistema.`
    : "Para começar a utilizar o sistema de gestão de horários, equipa de assistentes e relatórios, crie a primeira escola da organização.";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 w-full animate-in fade-in-50 duration-300">
      <div className="max-w-md w-full text-center flex flex-col items-center">
        {/* Decorative icon backdrop */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
            <Building2 size={38} strokeWidth={1.75} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border shadow-xs flex items-center justify-center text-muted-foreground">
            <Plus size={14} />
          </div>
        </div>

        {/* Text description */}
        <h3
          className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title || defaultTitle}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-sm">
          {description || defaultDescription}
        </p>

        {/* Call to action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigate("/platform-settings")}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm group"
          >
            <Plus size={16} />
            <span>Criar Primeira Escola</span>
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5 opacity-70"
            />
          </button>
        </div>

        {/* Helpful hint */}
        <div className="mt-8 pt-6 border-t border-border/60 w-full">
          <p className="text-xs text-muted-foreground/80">
            Pode também configurar utilizadores e permissões a qualquer momento nas{" "}
            <button
              type="button"
              onClick={() => navigate("/platform-settings")}
              className="text-primary hover:underline font-medium"
            >
              Configurações da Plataforma
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

