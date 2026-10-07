import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Loader2,
  Save,
  Shield,
  Upload,
  Download,
  X,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Role } from "../../types";
import { Card } from "../ui/card";
import ConfirmationModal from "../common/ConfirmationModal";
import { notify } from "../common/FeedbackNotification";
import { useAuth } from "../../context/AuthContext";
import authService from "../../api/services/auth.service";

interface AccountProfilePageProps {
  role?: Role;
}

export default function AccountProfilePage({
  role: propRole,
}: AccountProfilePageProps) {
  const { user, role: contextRole, refreshProfile, updateUserLocal, isLoading } = useAuth();
  const role = propRole || contextRole || "admin";

  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "privacy"
  >("profile");

  // ── Profile fields state ──────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [email, setEmail] = useState(user.email || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{
    first_name?: string;
    last_name?: string;
    email?: string;
  }>({});

  // Sync with auth user on mount or user change
  useEffect(() => {
    if (user) {
      if (user.first_name !== undefined && user.first_name !== null) {
        setFirstName(user.first_name);
      } else if (user.name) {
        const parts = user.name.split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
      if (user.last_name !== undefined && user.last_name !== null) {
        setLastName(user.last_name);
      }
      if (user.email) {
        setEmail(user.email);
      }
    }
  }, [user]);

  // ── Security fields state ─────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    current_password?: string;
    new_password?: string;
    new_password_confirmation?: string;
  }>({});

  const navigate = useNavigate();
  const { logout } = useAuth();

  // ── Privacy state ─────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRgpdConfirm, setShowRgpdConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [requestingDeactivation, setRequestingDeactivation] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [exportingData, setExportingData] = useState(false);

  async function handleExportData() {
    setExportingData(true);
    try {
      const data = await authService.exportPersonalData();
      // Criar blob para download do ficheiro JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dados-pessoais-${user?.id || "rgpd"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success("Exportação concluída. O ficheiro com os seus dados foi descarregado.");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Não foi possível exportar os seus dados pessoais.";
      notify.error(msg, undefined, "Erro na Exportação");
    } finally {
      setExportingData(false);
    }
  }

  async function handleRequestDeactivation() {
    setRequestingDeactivation(true);

    try {
      const res = await authService.requestDeactivation(deactivationReason.trim() || undefined);
      setShowRgpdConfirm(false);
      setDeactivationReason("");
      notify.success(
        res?.message || "Pedido de desativação submetido com sucesso. Os administradores foram notificados por email."
      );
    } catch (err: any) {
      setShowRgpdConfirm(false);
      const msg = err?.response?.data?.message || "Não foi possível submeter o pedido de desativação.";
      notify.error(msg, undefined, "Erro ao Enviar Pedido");
    } finally {
      setRequestingDeactivation(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);

    try {
      // O backend disponibilizou especificamente DELETE /api/me para o utilizador autenticado
      const res = await authService.deleteMe();
      setShowDeleteConfirm(false);
      notify.success(
        res?.message || "Conta eliminada com sucesso. Os acessos foram revogados."
      );
      // Efetua logout e redireciona para a página de login
      await logout();
      navigate("/login");
    } catch (err: any) {
      setShowDeleteConfirm(false);
      const status = err?.response?.status;
      const backendErrors = err?.response?.data?.errors;
      const userErrorMsg = backendErrors?.user?.[0];
      const message =
        userErrorMsg ||
        err?.response?.data?.message ||
        "Não foi possível eliminar a conta. Verifique com o administrador da instituição.";

      if (status === 422) {
        // Validação da regra de proteção: único admin ativo da instituição
        notify.error(
          message,
          undefined,
          "Operação Não Permitida"
        );
      } else if (status === 403) {
        notify.error(
          message || "Não tem permissões para eliminar esta conta.",
          undefined,
          "Acesso Negado"
        );
      } else {
        notify.error(message, undefined, "Erro ao Eliminar Conta");
      }
    } finally {
      setDeletingAccount(false);
    }
  }

  // ── Profile save handler ──────────────────────────────────────────────────
  async function handleSaveProfile() {
    const fName = firstName.trim();
    const lName = lastName.trim();
    const mail = email.trim();

    const errors: { first_name?: string; last_name?: string; email?: string } = {};

    if (!fName) {
      errors.first_name = "O primeiro nome é obrigatório.";
    }
    if (!lName) {
      errors.last_name = "O último nome é obrigatório.";
    }
    if (!mail) {
      errors.email = "O email é obrigatório.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      errors.email = "Por favor introduza um email válido.";
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});
    setSavingProfile(true);

    try {
      const res = await authService.updateProfile(
        { first_name: fName, last_name: lName, email: mail },
        user.id
      );
      updateUserLocal({ first_name: fName, last_name: lName, email: mail });
      await refreshProfile();
      notify.success("Dados pessoais atualizados com sucesso.");
    } catch (err: any) {
      const status = err?.response?.status;
      const backendErrors = err?.response?.data?.errors;
      const message = err?.response?.data?.message;

      if (status === 422 && backendErrors) {
        setProfileErrors({
          first_name: backendErrors.first_name?.[0],
          last_name: backendErrors.last_name?.[0],
          email: backendErrors.email?.[0],
        });
        if (message) {
          notify.error(message, undefined, "Erro de Validação");
        }
      } else if (status === 403) {
        notify.error(
          message || "Não tem permissão para alterar estes dados.",
          undefined,
          "Acesso Negado"
        );
      } else if (!err?.response) {
        notify.error("Não foi possível contactar o servidor para atualizar os dados pessoais.", undefined, "Erro de Ligação");
      } else {
        notify.error(
          message || "Não foi possível atualizar os dados pessoais.",
          undefined,
          "Erro"
        );
      }
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Password change handler ───────────────────────────────────────────────
  async function handleChangePassword() {
    const curr = currentPassword;
    const next = newPassword;
    const nextConf = newPasswordConfirmation;

    const errors: {
      current_password?: string;
      new_password?: string;
      new_password_confirmation?: string;
    } = {};

    if (!curr) {
      errors.current_password = "A password atual é obrigatória.";
    }
    if (!next) {
      errors.new_password = "A nova password é obrigatória.";
    } else if (next.length < 8) {
      errors.new_password = "A nova password deve conter pelo menos 8 caracteres.";
    }
    if (!nextConf) {
      errors.new_password_confirmation = "Confirme a nova password.";
    } else if (next !== nextConf) {
      errors.new_password_confirmation = "As passwords não coincidem.";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordErrors({});
    setSavingPassword(true);

    try {
      const res = await authService.changePassword({
        current_password: curr,
        new_password: next,
        new_password_confirmation: nextConf,
      });
      notify.success(res?.message || "Password atualizada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
    } catch (err: any) {
      const backendErrors = err?.response?.data?.errors;
      if (backendErrors) {
        setPasswordErrors({
          current_password: backendErrors.current_password?.[0],
          new_password: backendErrors.new_password?.[0],
          new_password_confirmation: backendErrors.new_password_confirmation?.[0],
        });
      } else {
        const errorMsg =
          err?.response?.data?.message ||
          "Não foi possível atualizar a password. Verifique os dados introduzidos.";
        notify.error(errorMsg);
      }
    } finally {
      setSavingPassword(false);
    }
  }

  if (isLoading || !user?.email) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">A carregar os seus dados de conta...</p>
      </div>
    );
  }

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
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Primeiro Nome <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (profileErrors.first_name) {
                        setProfileErrors((prev) => ({ ...prev, first_name: undefined }));
                      }
                    }}
                    placeholder="Ex: Miguel"
                    className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                      profileErrors.first_name
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-ring"
                    }`}
                  />
                  {profileErrors.first_name && (
                    <p className="text-[11px] text-destructive mt-1 font-medium">
                      {profileErrors.first_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Último Nome <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (profileErrors.last_name) {
                        setProfileErrors((prev) => ({ ...prev, last_name: undefined }));
                      }
                    }}
                    placeholder="Ex: Silva"
                    className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                      profileErrors.last_name
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-ring"
                    }`}
                  />
                  {profileErrors.last_name && (
                    <p className="text-[11px] text-destructive mt-1 font-medium">
                      {profileErrors.last_name}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  Email Institucional <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (profileErrors.email) {
                      setProfileErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="utilizador@sgde.pt"
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                    profileErrors.email
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-ring"
                  }`}
                />
                {profileErrors.email && (
                  <p className="text-[11px] text-destructive mt-1 font-medium">
                    {profileErrors.email}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile || !firstName.trim() || !lastName.trim() || !email.trim()}
              className="mt-5 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors shadow-xs"
            >
              {savingProfile ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Guardar Alterações
                </>
              )}
            </button>
          </Card>
        </div>
      )}

      {activeTab === "security" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Alterar Password
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Password Atual <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (passwordErrors.current_password) {
                      setPasswordErrors((prev) => ({ ...prev, current_password: undefined }));
                    }
                  }}
                  placeholder="Introduza a sua password atual"
                  className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                    passwordErrors.current_password
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-ring"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordErrors.current_password && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {passwordErrors.current_password}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Nova Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordErrors.new_password) {
                      setPasswordErrors((prev) => ({ ...prev, new_password: undefined }));
                    }
                  }}
                  placeholder="Mínimo de 8 caracteres"
                  className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                    passwordErrors.new_password
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-ring"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordErrors.new_password && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {passwordErrors.new_password}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Confirmar Nova Password <span className="text-destructive">*</span>
              </label>
              <input
                type="password"
                value={newPasswordConfirmation}
                onChange={(e) => {
                  setNewPasswordConfirmation(e.target.value);
                  if (passwordErrors.new_password_confirmation) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      new_password_confirmation: undefined,
                    }));
                  }
                }}
                placeholder="Repita a nova password"
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                  passwordErrors.new_password_confirmation
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {passwordErrors.new_password_confirmation && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {passwordErrors.new_password_confirmation}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleChangePassword}
            disabled={savingPassword || !currentPassword || !newPassword || !newPasswordConfirmation}
            className="mt-5 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors shadow-xs"
          >
            {savingPassword ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                A atualizar...
              </>
            ) : (
              <>
                <Shield size={14} />
                Atualizar Password
              </>
            )}
          </button>
        </Card>
      )}

      {activeTab === "privacy" && (
        <div className="space-y-4">
          {/* Cartão de Portabilidade RGPD (disponível para todos os utilizadores) */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Portabilidade de Dados (RGPD)
            </h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Descarregue uma cópia integral de todos os seus dados pessoais e de registo guardados na plataforma (perfil de utilizador, dados profissionais e contactos de emergência) em formato estruturado JSON.
            </p>
            <button
              type="button"
              onClick={handleExportData}
              disabled={exportingData}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/60 disabled:opacity-50 transition-colors shadow-xs"
            >
              {exportingData ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  A descarregar dados...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Descarregar os Meus Dados (JSON)
                </>
              )}
            </button>
          </Card>

          {role === "admin" ? (
            <Card className="p-5 border-destructive/20">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Eliminar Conta de Administrador
              </h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Ao eliminar a sua conta de administrador, os seus acessos serão revogados de imediato. Todo o histórico de operações criado por si na instituição (escalas, aprovações de ausências e configurações) será preservado de forma íntegra no sistema, sendo os seus dados de identificação pessoal devidamente anonimizados ao abrigo do RGPD.
              </p>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground mb-4">
                <strong>Salvaguarda de Segurança:</strong> Esta operação exige que exista pelo menos mais um administrador ativo na instituição para garantir a continuidade da gestão escolar.
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deletingAccount}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors shadow-xs"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    A processar eliminação...
                  </>
                ) : (
                  <>
                    <X size={14} />
                    Eliminar e Anonimizar Conta
                  </>
                )}
              </button>
            </Card>
          ) : (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Solicitar Desativação e Anonimização de Dados (RGPD)
              </h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Como assistente operacional com registo vinculado à gestão de escalas escolares, a sua conta não pode ser eliminada diretamente para salvaguarda da operação. Pode submeter aqui um pedido formal de desativação e anonimização de dados pessoais, que será enviado por email aos administradores da sua escola para validação do processo.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeactivationReason("");
                  setShowRgpdConfirm(true);
                }}
                disabled={requestingDeactivation}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C8291A]/30 text-[#C8291A] text-sm font-medium hover:bg-[#FEF2F2] disabled:opacity-50 transition-colors"
              >
                {requestingDeactivation ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    A submeter pedido...
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    Solicitar Desativação de Conta
                  </>
                )}
              </button>
            </Card>
          )}
        </div>
      )}

      {/* Confirmation Modal for Staff RGPD Request */}
      <ConfirmationModal
        open={showRgpdConfirm}
        onClose={() => setShowRgpdConfirm(false)}
        onConfirm={handleRequestDeactivation}
        title="Solicitar Desativação e Eliminação de Dados (RGPD)"
        description={
          <div className="space-y-3">
            <p>
              Tem a certeza que pretende solicitar a desativação da sua conta e a anonimização dos seus dados pessoais?
            </p>
            <p className="text-xs text-muted-foreground">
              Os administradores da sua instituição serão notificados por email com o seu pedido para dar seguimento ao processo legal e operacional de desativação.
            </p>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Motivo do pedido (opcional):
              </label>
              <textarea
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                maxLength={1000}
                placeholder="Indique o motivo ou observações relevantes para o administrador..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none h-20"
              />
            </div>
          </div>
        }
        confirmLabel={requestingDeactivation ? "A enviar..." : "Submeter Pedido aos Administradores"}
        cancelLabel="Cancelar"
        variant="warning"
      />

      {/* Confirmation Modal for Admin account deletion */}
      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Eliminar Conta de Administrador"
        description="Tem a certeza que pretende eliminar a sua conta? Os seus acessos serão revogados e os seus dados pessoais serão anonimizados, preservando o histórico de todas as operações e escalas criadas por si no sistema. Esta ação não poderá ser concluída caso seja o único administrador ativo desta instituição."
        confirmLabel="Eliminar e Anonimizar"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}

