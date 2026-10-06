import React, { useState } from "react";
import {
  AlertTriangle,
  Save,
  Shield,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import type { Role } from "../../types";
import { Card } from "../ui/card";
import DatePicker from "../common/DatePicker";
import ConfirmationModal from "../common/ConfirmationModal";
import { toast } from "sonner";

interface AccountProfilePageProps {
  role?: Role;
}

export default function AccountProfilePage({
  role = "admin",
}: AccountProfilePageProps) {
  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "privacy"
  >("profile");
  const [email, setEmail] = useState(
    role === "admin" ? "miguel.silva@sgde.pt" : "fabio.lopes@sgde.pt"
  );
  const [name, setName] = useState(
    role === "admin" ? "Miguel Silva" : "Fábio Lopes"
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRgpdConfirm, setShowRgpdConfirm] = useState(false);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">A Minha Conta</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerir dados pessoais, segurança e privacidade
        </p>
      </div>

      <div className="flex gap-1 border-b border-border mb-6">
        {[
          { id: "profile", label: "Perfil" },
          { id: "security", label: "Segurança" },
          { id: "privacy", label: "Privacidade & RGPD" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() =>
              setActiveTab(t.id as "profile" | "security" | "privacy")
            }
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Dados Pessoais
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Nome completo
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <button
              type="button"
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <Save size={14} />
              Guardar Alterações
            </button>
          </Card>
          {role === "staff" && (
            <Card className="p-5 border-[#D97706]/30 bg-[#FEF9EC]/50">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle
                  size={16}
                  className="text-[#D97706] flex-shrink-0 mt-0.5"
                />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Registo Criminal
                  </h3>
                  <p className="text-xs text-[#D97706] mt-0.5">
                    O seu registo criminal expira em 15 Mar 2026. Submeta um novo
                    documento.
                  </p>
                </div>
              </div>
              <div className="border-2 border-dashed border-border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-accent/50 transition-colors mb-3">
                <Upload
                  size={16}
                  className="text-muted-foreground flex-shrink-0"
                />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Clique para submeter novo registo criminal
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    PDF, JPG · Max 5MB
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Data de Validade
                </label>
                <DatePicker value="" onChange={() => {}} className="w-full" />
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "security" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Alterar Password
          </h3>
          <div className="space-y-3">
            {[
              "Password Atual",
              "Nova Password",
              "Confirmar Nova Password",
            ].map((l) => (
              <div key={l}>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  {l}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Shield size={14} />
            Atualizar Password
          </button>
        </Card>
      )}

      {activeTab === "privacy" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Direito ao Esquecimento (RGPD)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Solicitar a eliminação de todos os dados pessoais. Esta operação é
              irreversível e sujeita a análise.
            </p>
            <button
              type="button"
              onClick={() => setShowRgpdConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C8291A]/30 text-[#C8291A] text-sm font-medium hover:bg-[#FEF2F2] transition-colors"
            >
              <XCircle size={14} />
              Solicitar Eliminação de Dados
            </button>
          </Card>
          <Card className="p-5 border-destructive/20">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Eliminar Conta
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Elimina permanentemente esta conta e revoga todos os acessos.
              Irreversível.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors shadow-xs"
            >
              <X size={14} />
              Eliminar Conta
            </button>
          </Card>
        </div>
      )}

      {/* Confirmation Modal for RGPD Right to be Forgotten */}
      <ConfirmationModal
        open={showRgpdConfirm}
        onClose={() => setShowRgpdConfirm(false)}
        onConfirm={() => {
          setShowRgpdConfirm(false);
          toast.success(
            "Pedido de eliminação de dados (RGPD) registado com sucesso. Os dados pessoais serão anonimizados no BackOffice."
          );
        }}
        title="Direito ao Esquecimento (RGPD)"
        description="Tem a certeza que pretende solicitar a eliminação dos seus dados pessoais? Os seus dados de identificação serão anonimizados no sistema e os seus acessos revogados, mantendo-se apenas o registo histórico legal e operacional dos turnos e atividades já realizadas."
        confirmLabel="Confirmar Pedido RGPD"
        cancelLabel="Cancelar"
        variant="warning"
      />

      {/* Confirmation Modal for account deletion */}
      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          toast.success("Conta eliminada com sucesso. Os acessos foram revogados.");
        }}
        title="Eliminar Conta"
        description="Tem a certeza que pretende eliminar permanentemente esta conta? Esta operação é irreversível, revogará todos os acessos e os dados pessoais associados serão anonimizados na plataforma."
        confirmLabel="Eliminar Definitivamente"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}

